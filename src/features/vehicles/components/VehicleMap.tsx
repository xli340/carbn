import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import {
  AdvancedMarker,
  InfoWindow,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { LoaderCircle } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/config/map'
import type { MapBounds, Vehicle, VehicleTrackPoint } from '../types'
import { VehicleTrackLayer } from './VehicleTrackLayer'

interface VehicleMapProps {
  vehicles: Vehicle[]
  bounds: MapBounds
  selectedVehicleId?: string
  trackPoints: VehicleTrackPoint[]
  isLoading?: boolean
  mapId?: string
  onSelectVehicle?: (vehicleId?: string) => void
  onBoundsChange?: (bounds: MapBounds) => void
  onBookVehicle?: (vehicle: Vehicle) => void
  onDismissInfoWindow?: () => void
  showInfoWindow?: boolean
  isTrackActive?: boolean
  onResetTrack?: () => void
  onEndTrip?: () => void
  activeTripVehicleId?: string
  hideVehicles?: boolean
  showTrackEndpoints?: boolean
  fitTrackToView?: boolean
}

type VehicleClusterGroup = {
  centroid: google.maps.LatLngLiteral
  vehicles: Vehicle[]
}

type AnimationState = 'idle' | 'running' | 'paused' | 'completed'

const MIN_SEGMENT_DURATION_MS = 180
const MAX_SEGMENT_DURATION_MS = 3200
const FALLBACK_SEGMENT_DURATION_MS = 800

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeHeadingDegrees(heading: number) {
  return (heading % 360 + 360) % 360
}

function shortestHeadingDelta(from: number, to: number) {
  const delta = normalizeHeadingDegrees(to) - normalizeHeadingDegrees(from)
  return (((delta + 540) % 360) - 180)
}

function headingFromPoints(a: VehicleTrackPoint, b: VehicleTrackPoint) {
  const rad = Math.atan2(b.lng - a.lng, b.lat - a.lat)
  return normalizeHeadingDegrees((rad * 180) / Math.PI)
}

function clusterRadiusForZoom(zoom: number) {
  if (zoom <= 5) return 1.2
  if (zoom <= 6) return 0.9
  if (zoom <= 7) return 0.6
  if (zoom <= 8) return 0.35
  if (zoom <= 10) return 0.18
  if (zoom <= 12) return 0.09
  if (zoom <= 14) return 0.04
  return 0.02
}

export const VehicleMap = memo(function VehicleMap({
  vehicles,
  bounds,
  selectedVehicleId,
  trackPoints,
  isLoading,
  mapId,
  onSelectVehicle,
  onBoundsChange,
  onBookVehicle,
  onDismissInfoWindow,
  onEndTrip,
  activeTripVehicleId,
  showInfoWindow = true,
  isTrackActive,
  onResetTrack,
  fitTrackToView = true,
  hideVehicles = false,
  showTrackEndpoints = false,
}: VehicleMapProps) {
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM)
  const [isAnimationMode, setIsAnimationMode] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [interpolatedPoint, setInterpolatedPoint] = useState<VehicleTrackPoint | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const segmentIndexRef = useRef(0)
  const segmentStartTimeRef = useRef(0)
  const pausedProgressRef = useRef(0)
  const speedRef = useRef(playbackSpeed)
  const coreLibrary = useMapsLibrary('core')

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId),
    [selectedVehicleId, vehicles],
  )

  useEffect(() => {
    speedRef.current = playbackSpeed
  }, [playbackSpeed])

  const defaultBoundsLiteral = useMemo(
    () => ({
      south: bounds.sw.lat,
      west: bounds.sw.lng,
      north: bounds.ne.lat,
      east: bounds.ne.lng,
    }),
    [bounds],
  )

  const handleCameraChange = useCallback(
    (event: MapCameraChangedEvent) => {
      setMapZoom(event.detail.zoom)
      if (!event.detail.bounds || !onBoundsChange) {
        return
      }

      const { north, south, east, west } = event.detail.bounds
      onBoundsChange({
        sw: { lat: south, lng: west },
        ne: { lat: north, lng: east },
      })
    },
    [onBoundsChange],
  )
  const normalizedMapId = mapId?.trim() || undefined
  const supportsAdvancedMarkers = Boolean(normalizedMapId)
  const mapInstance = useMap()

  const animationEnabled = isAnimationMode && trackPoints.length > 0

  const trackSegments = useMemo(() => {
    if (trackPoints.length < 2) {
      return []
    }

    return trackPoints.slice(0, -1).map((point, index) => {
      const next = trackPoints[index + 1]
      const startTs = new Date(point.timestamp).getTime()
      const endTs = new Date(next.timestamp).getTime()
      const rawDuration = endTs - startTs
      const durationMs =
        Number.isFinite(rawDuration) && rawDuration > 0
          ? clamp(rawDuration, MIN_SEGMENT_DURATION_MS, MAX_SEGMENT_DURATION_MS)
          : FALLBACK_SEGMENT_DURATION_MS

      return { from: point, to: next, durationMs }
    })
  }, [trackPoints])

  const { totalTrackDurationMs, segmentStartOffsets } = useMemo(() => {
    let offset = 0
    const offsets = trackSegments.map((segment) => {
      const start = offset
      offset += segment.durationMs
      return start
    })

    return { totalTrackDurationMs: offset, segmentStartOffsets: offsets }
  }, [trackSegments])

  const overallProgress = useMemo(() => {
    if (!animationEnabled || !trackSegments.length || totalTrackDurationMs <= 0) {
      return 0
    }

    if (animationState === 'completed' || playbackIndex >= trackPoints.length - 1) {
      return 100
    }

    const currentSegmentIndex = clamp(segmentIndexRef.current, 0, trackSegments.length - 1)
    const currentSegment = trackSegments[currentSegmentIndex]
    const segmentStart = segmentStartOffsets[currentSegmentIndex] ?? 0
    const elapsedInSegment = Math.min(pausedProgressRef.current, currentSegment.durationMs)
    const segmentProgress =
      currentSegment.durationMs > 0 ? elapsedInSegment / currentSegment.durationMs : 0

    const completedMs = segmentStart + currentSegment.durationMs * segmentProgress
    const ratio = completedMs / totalTrackDurationMs
    if (!Number.isFinite(ratio)) {
      return 0
    }

    return Math.max(0, Math.min(100, ratio * 100))
  }, [
    animationEnabled,
    animationState,
    interpolatedPoint,
    segmentStartOffsets,
    totalTrackDurationMs,
    trackSegments,
    playbackIndex,
    trackPoints.length,
  ])

  const currentAnimatedPoint = useMemo(() => {
    if (!animationEnabled) return null
    if (interpolatedPoint) return interpolatedPoint
    const clampedIndex = Math.min(playbackIndex, trackPoints.length - 1)
    return trackPoints[clampedIndex]
  }, [animationEnabled, interpolatedPoint, playbackIndex, trackPoints])

  const animatedTrail = useMemo(() => {
    if (!animationEnabled) return []
    const endIndex = Math.min(playbackIndex + 1, trackPoints.length)
    const trail = trackPoints.slice(0, endIndex)
    if (interpolatedPoint) {
      const lastPoint = trail[trail.length - 1]
      if (!lastPoint || lastPoint.lat !== interpolatedPoint.lat || lastPoint.lng !== interpolatedPoint.lng) {
        trail.push(interpolatedPoint)
      }
    }
    return trail
  }, [animationEnabled, interpolatedPoint, playbackIndex, trackPoints])

  const clusterRadius = useMemo(() => clusterRadiusForZoom(mapZoom), [mapZoom])

  const groupedVehicles = useMemo<VehicleClusterGroup[]>(() => {
    if (!vehicles.length) {
      return []
    }
    const groups: VehicleClusterGroup[] = []
    vehicles.forEach((vehicle) => {
      const existingGroup = groups.find(
        (group) =>
          Math.abs(group.centroid.lat - vehicle.lat) <= clusterRadius &&
          Math.abs(group.centroid.lng - vehicle.lng) <= clusterRadius,
      )

      if (existingGroup) {
        existingGroup.vehicles.push(vehicle)
        const count = existingGroup.vehicles.length
        existingGroup.centroid = {
          lat: existingGroup.centroid.lat + (vehicle.lat - existingGroup.centroid.lat) / count,
          lng: existingGroup.centroid.lng + (vehicle.lng - existingGroup.centroid.lng) / count,
        }
      } else {
        groups.push({
          centroid: { lat: vehicle.lat, lng: vehicle.lng },
          vehicles: [vehicle],
        })
      }
    })

    return groups
  }, [clusterRadius, vehicles])

  useEffect(() => {
    if (!animationEnabled || !mapInstance || !trackPoints.length) {
      return
    }

    if (trackPoints.length === 1) {
      const startPoint = trackPoints[0]
      mapInstance.panTo({ lat: startPoint.lat, lng: startPoint.lng })
      const currentZoom = mapInstance.getZoom?.() ?? DEFAULT_MAP_ZOOM
      mapInstance.setZoom(Math.max(currentZoom, 14))
      return
    }

    const bounds = new google.maps.LatLngBounds()
    trackPoints.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }))
    mapInstance.fitBounds(bounds, 80)
    const currentZoom = mapInstance.getZoom?.()
    if (currentZoom) {
      const clampedZoom = Math.min(Math.max(currentZoom, 13), 15)
      mapInstance.setZoom(clampedZoom)
    }
  }, [animationEnabled, mapInstance, trackPoints])

  useEffect(() => {
    if (!animationEnabled || animationState !== 'running' || !trackSegments.length) {
      return
    }

    segmentIndexRef.current = clamp(segmentIndexRef.current, 0, trackSegments.length - 1)

    // Drive playback with requestAnimationFrame so position/heading tween smoothly using segment durations.
    const step = (now: number) => {
      const currentSegment = trackSegments[segmentIndexRef.current]
      if (!currentSegment) {
        setInterpolatedPoint(trackPoints[trackPoints.length - 1] ?? null)
        setPlaybackIndex(trackPoints.length - 1)
        setAnimationState('completed')
        return
      }

      const effectiveDuration = Math.max(
        80,
        currentSegment.durationMs / Math.max(speedRef.current, 0.1),
      )
      const elapsed = now - segmentStartTimeRef.current
      const t = Math.min(elapsed / effectiveDuration, 1)

      const headingStart = Number.isFinite(currentSegment.from.heading)
        ? currentSegment.from.heading
        : headingFromPoints(currentSegment.from, currentSegment.to)
      const headingEnd = Number.isFinite(currentSegment.to.heading)
        ? currentSegment.to.heading
        : headingFromPoints(currentSegment.from, currentSegment.to)
      const interpolatedHeading = normalizeHeadingDegrees(
        headingStart + shortestHeadingDelta(headingStart, headingEnd) * t,
      )

      const interpolatedSpeed =
        currentSegment.from.speed + (currentSegment.to.speed - currentSegment.from.speed) * t

      const nextPoint: VehicleTrackPoint = {
        lat: currentSegment.from.lat + (currentSegment.to.lat - currentSegment.from.lat) * t,
        lng: currentSegment.from.lng + (currentSegment.to.lng - currentSegment.from.lng) * t,
        heading: interpolatedHeading,
        speed: interpolatedSpeed,
        timestamp: currentSegment.from.timestamp,
      }

      setInterpolatedPoint(nextPoint)
      pausedProgressRef.current = elapsed

      if (t >= 1) {
        const overshoot = Math.max(0, elapsed - effectiveDuration)
        segmentIndexRef.current += 1
        setPlaybackIndex(segmentIndexRef.current)
        pausedProgressRef.current = 0

        if (segmentIndexRef.current >= trackSegments.length) {
          setInterpolatedPoint(trackPoints[trackPoints.length - 1] ?? null)
          setAnimationState('completed')
          return
        }

        segmentStartTimeRef.current = now - overshoot
      }

      animationFrameRef.current = window.requestAnimationFrame(step)
    }

    segmentStartTimeRef.current = performance.now() - pausedProgressRef.current
    animationFrameRef.current = window.requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [animationEnabled, animationState, trackSegments, trackPoints])

  useEffect(() => {
    if (!animationEnabled || !mapInstance || !trackPoints.length) {
      return
    }
    const activePoint = trackPoints[Math.min(playbackIndex, trackPoints.length - 1)]
    if (activePoint) {
      mapInstance.panTo({ lat: activePoint.lat, lng: activePoint.lng })
    }
  }, [animationEnabled, mapInstance, playbackIndex, trackPoints])

  const cancelAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  useEffect(() => cancelAnimationLoop, [cancelAnimationLoop])

  useEffect(() => {
    if (!animationEnabled) {
      cancelAnimationLoop()
      setInterpolatedPoint(null)
      segmentIndexRef.current = 0
      pausedProgressRef.current = 0
      segmentStartTimeRef.current = 0
    }
  }, [animationEnabled, cancelAnimationLoop])

  const handleStartAnimation = useCallback(() => {
    if (!trackPoints.length) return
    if (trackPoints.length <= 1) {
      setPlaybackIndex(trackPoints.length - 1)
      setAnimationState('completed')
      return
    }
    if (animationState === 'completed' || animationState === 'idle') {
      segmentIndexRef.current = 0
      pausedProgressRef.current = 0
      segmentStartTimeRef.current = 0
      setPlaybackIndex(0)
      setInterpolatedPoint(trackPoints[0])
    }
    setAnimationState('running')
  }, [animationState, trackPoints])

  const handlePauseAnimation = useCallback(() => {
    if (animationState === 'running') {
      setAnimationState('paused')
    }
  }, [animationState])

  const resetAnimation = useCallback(() => {
    cancelAnimationLoop()
    setAnimationState('idle')
    setPlaybackIndex(0)
    setPlaybackSpeed(1)
    setInterpolatedPoint(null)
    segmentIndexRef.current = 0
    pausedProgressRef.current = 0
    segmentStartTimeRef.current = 0
  }, [cancelAnimationLoop])

  const handleToggleAnimationMode = useCallback(
    (checked: boolean) => {
      setIsAnimationMode(checked)
      resetAnimation()
    },
    [resetAnimation],
  )

  const adjustPlaybackSpeed = useCallback((delta: number) => {
    setPlaybackSpeed((current) => {
      const next = Math.min(Math.max(0.5, Number((current + delta).toFixed(1))), 16)
      return next
    })
  }, [])

  const handleExitAnimation = useCallback(() => {
    setIsAnimationMode(false)
    resetAnimation()
    onResetTrack?.()
  }, [onResetTrack, resetAnimation])

  const markerColorFor = useCallback(
    (vehicle: Vehicle) => {
      if (activeTripVehicleId && vehicle.vehicle_id === activeTripVehicleId) {
        return '#fbbf24'
      }
      return vehicle.ignition_on ? '#ef4444' : '#111111'
    },
    [activeTripVehicleId],
  )

  const tripInProgress = Boolean(activeTripVehicleId)

  return (
    <div className="relative h-full w-full min-w-0">
      {tripInProgress && onEndTrip && (
        <>
          <div className="touch-overlay absolute inset-x-0 bottom-4 z-20 flex justify-center px-3 md:hidden">
            <div className="w-full max-w-[520px] select-none">
              <Button className="h-10 w-full" variant="destructive" onClick={onEndTrip}>
                End trip
              </Button>
            </div>
          </div>
          <div className="touch-overlay absolute top-4 right-4 z-20 hidden md:flex">
            <div className="select-none">
              <Button size="sm" variant="destructive" onClick={onEndTrip}>
                End trip
              </Button>
            </div>
          </div>
        </>
      )}
      {(trackPoints.length > 0 || isTrackActive) && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3 md:top-4 md:bottom-auto md:justify-end md:px-4">
          <div className="touch-overlay flex w-full max-w-[520px] flex-col items-stretch gap-2 select-none md:max-w-[420px] md:items-end">
            <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold leading-none text-foreground">Track playback</p>
                <p className="text-[11px] text-muted-foreground">Choose how to view history</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="track-animation-mode" className="text-[11px] text-muted-foreground">
                  Off
                </Label>
                <Switch
                  id="track-animation-mode"
                  checked={isAnimationMode}
                  onCheckedChange={handleToggleAnimationMode}
                />
                <Label
                  htmlFor="track-animation-mode"
                  className="text-[11px] font-medium text-foreground"
                >
                  Animation
                </Label>
              </div>
            </div>

            {animationEnabled && (
              <div className="flex w-full flex-col gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Playback progress</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
                <div className="grid w-full grid-cols-5 gap-2 md:gap-3">
                  <Button
                    size="sm"
                    className="h-8 min-w-0 px-2 text-xs"
                    onClick={handleStartAnimation}
                    disabled={animationState === 'running'}
                  >
                    {animationState === 'completed' ? 'Replay' : 'Start'}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 min-w-0 px-2 text-xs"
                    variant="secondary"
                    onClick={handlePauseAnimation}
                    disabled={animationState !== 'running'}
                  >
                    Pause
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 min-w-0 px-2 text-xs"
                    variant="secondary"
                    onClick={() => adjustPlaybackSpeed(-0.5)}
                    disabled={playbackSpeed <= 0.5}
                  >
                    Slow
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 min-w-0 px-2 text-xs"
                    variant="secondary"
                    onClick={() => adjustPlaybackSpeed(0.5)}
                    disabled={playbackSpeed >= 16}
                  >
                    Fast
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 min-w-0 px-2 text-xs"
                    variant="destructive"
                    onClick={handleExitAnimation}
                  >
                    Exit
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Speed {playbackSpeed.toFixed(1)}x</span>
                  <span>
                    ·{' '}
                    {animationState === 'running'
                      ? 'Playing'
                      : animationState === 'paused'
                        ? 'Paused'
                        : animationState === 'completed'
                          ? 'Completed'
                          : 'Ready'}
                  </span>
                </div>
              </div>
            )}

            {!animationEnabled && onResetTrack && (
              <div className="pointer-events-auto flex w-full flex-wrap items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
                <Button
                  size="sm"
                  className="h-8 min-w-0 px-2 text-xs"
                  variant="destructive"
                  onClick={handleExitAnimation}
                >
                  Exit
                </Button>
                <span className="text-xs text-muted-foreground">Clear current track view</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Map
        defaultZoom={DEFAULT_MAP_ZOOM}
        defaultCenter={DEFAULT_MAP_CENTER}
        defaultBounds={defaultBoundsLiteral}
        mapId={normalizedMapId}
        gestureHandling="greedy"
        fullscreenControl={false}
        streetViewControl={false}
        onCameraChanged={handleCameraChange}
        style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
      >
        {!hideVehicles &&
          (supportsAdvancedMarkers
            ? groupedVehicles.map((group) => {
              const key = group.vehicles.map((vehicle) => vehicle.vehicle_id).join('-')
              if (group.vehicles.length > 1) {
                return (
                  <AdvancedMarker
                    key={`cluster-${key}`}
                    position={group.centroid}
                    onClick={() => {
                      if (!mapInstance) return
                      const nextZoom = Math.min(Math.round(mapZoom) + 2, 16)
                      mapInstance.setZoom(nextZoom)
                      mapInstance.panTo(group.centroid)
                    }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-primary text-sm font-semibold text-primary-foreground shadow-lg">
                      {group.vehicles.length}
                    </div>
                  </AdvancedMarker>
                )
              }

              const vehicle = group.vehicles[0]
              const heading = Number.isFinite(vehicle.heading) ? vehicle.heading : 0
              const markerColor = markerColorFor(vehicle)
              return (
                <AdvancedMarker
                  key={vehicle.vehicle_id}
                  position={group.centroid}
                  title={vehicle.registration}
                  onClick={() => onSelectVehicle?.(vehicle.vehicle_id)}
                >
                  <VehicleMarkerIcon
                    heading={heading}
                    selected={vehicle.vehicle_id === selectedVehicleId}
                    color={markerColor}
                  />
                </AdvancedMarker>
              )
            })
            : groupedVehicles.map((group) => {
              const key = group.vehicles.map((vehicle) => vehicle.vehicle_id).join('-')
              const position = group.centroid
              if (group.vehicles.length > 1) {
                return (
                  <Marker
                    key={`cluster-${key}`}
                    position={position}
                    icon={
                      coreLibrary
                        ? {
                            path: coreLibrary.SymbolPath.CIRCLE,
                            scale: 18,
                            fillColor: '#2563eb',
                            fillOpacity: 0.95,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                          }
                        : undefined
                    }
                    label={{
                      text: String(group.vehicles.length),
                      color: '#ffffff',
                      fontWeight: '600',
                    }}
                    onClick={() => {
                      if (!mapInstance) return
                      const nextZoom = Math.min(Math.round(mapZoom) + 2, 16)
                      mapInstance.setZoom(nextZoom)
                      mapInstance.panTo(position)
                    }}
                  />
                )
              }

              const vehicle = group.vehicles[0]
              const isSelected = vehicle.vehicle_id === selectedVehicleId
              const heading = Number.isFinite(vehicle.heading) ? vehicle.heading : 0
              const markerColor = markerColorFor(vehicle)
              return (
                <Marker
                  key={vehicle.vehicle_id}
                  position={position}
                  icon={
                    coreLibrary
                      ? {
                          url: buildFallbackMarkerIcon(markerColor, heading, isSelected),
                          scaledSize: new coreLibrary.Size(32, 32),
                          anchor: new coreLibrary.Point(16, 24),
                        }
                      : undefined
                  }
                  onClick={() => onSelectVehicle?.(vehicle.vehicle_id)}
                />
              )
            }))}

        {animationEnabled ? (
          <>
            {animatedTrail.length > 1 && (
              <VehicleTrackLayer points={animatedTrail} color="#ef4444" fitToPath={false} />
            )}

            {currentAnimatedPoint &&
              (supportsAdvancedMarkers ? (
                <AdvancedMarker
                  position={{ lat: currentAnimatedPoint.lat, lng: currentAnimatedPoint.lng }}
                  title="Playback vehicle"
                >
                  <VehicleMarkerIcon
                    heading={
                      Number.isFinite(currentAnimatedPoint.heading) ? currentAnimatedPoint.heading : 0
                    }
                    selected={false}
                    color="#111111"
                  />
                </AdvancedMarker>
              ) : (
                <Marker
                  position={{ lat: currentAnimatedPoint.lat, lng: currentAnimatedPoint.lng }}
                  icon={
                    coreLibrary
                      ? {
                          url: buildFallbackMarkerIcon(
                            '#111111',
                            Number.isFinite(currentAnimatedPoint.heading)
                              ? currentAnimatedPoint.heading
                              : 0,
                            false,
                          ),
                          scaledSize: new coreLibrary.Size(32, 32),
                          anchor: new coreLibrary.Point(16, 24),
                        }
                      : undefined
                  }
                />
              ))}
          </>
        ) : (
          <>
            {!!trackPoints.length && (
              <VehicleTrackLayer points={trackPoints} fitToPath={fitTrackToView} />
            )}

            {showTrackEndpoints && trackPoints.length > 0 && (
              <>
                {supportsAdvancedMarkers ? (
                  <>
                    <AdvancedMarker
                      position={{ lat: trackPoints[0].lat, lng: trackPoints[0].lng }}
                      title="Start"
                    >
                      <TrackPin label="Start" color="#10b981" />
                    </AdvancedMarker>
                    <AdvancedMarker
                      position={{ lat: trackPoints[trackPoints.length - 1].lat, lng: trackPoints[trackPoints.length - 1].lng }}
                      title="End"
                    >
                      <TrackPin label="End" color="#ef4444" />
                    </AdvancedMarker>
                  </>
                ) : (
                  <>
                    <Marker
                      position={{ lat: trackPoints[0].lat, lng: trackPoints[0].lng }}
                      label={{ text: 'Start', color: '#ffffff', fontWeight: '600' }}
                      icon={
                        coreLibrary
                          ? {
                              url: buildTrackPinIcon('#10b981'),
                              scaledSize: new coreLibrary.Size(36, 50),
                              anchor: new coreLibrary.Point(18, 46),
                            }
                          : undefined
                      }
                    />
                    <Marker
                      position={{ lat: trackPoints[trackPoints.length - 1].lat, lng: trackPoints[trackPoints.length - 1].lng }}
                      label={{ text: 'End', color: '#ffffff', fontWeight: '600' }}
                      icon={
                        coreLibrary
                          ? {
                              url: buildTrackPinIcon('#ef4444'),
                              scaledSize: new coreLibrary.Size(36, 50),
                              anchor: new coreLibrary.Point(18, 46),
                            }
                          : undefined
                      }
                    />
                  </>
                )}
              </>
            )}
          </>
        )}

        {selectedVehicle && showInfoWindow && !hideVehicles && (
          <InfoWindow
            position={{
              lat: selectedVehicle.lat,
              lng: selectedVehicle.lng,
            }}
            onClose={() => {
              onDismissInfoWindow?.()
            }}
          >
            <VehicleInfo
              vehicle={selectedVehicle}
              onBookVehicle={onBookVehicle}
              onEndTrip={onEndTrip}
              tripActive={activeTripVehicleId === selectedVehicle.vehicle_id}
            />
          </InfoWindow>
        )}
      </Map>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Syncing vehicles…
          </div>
        </div>
      )}
    </div>
  )
})

function VehicleInfo({
  vehicle,
  onBookVehicle,
  onEndTrip,
  tripActive,
}: {
  vehicle: Vehicle
  onBookVehicle?: (vehicle: Vehicle) => void
  onEndTrip?: () => void
  tripActive?: boolean
}) {
  const speedDisplay =
    typeof vehicle.speed === 'number' && Number.isFinite(vehicle.speed)
      ? `${vehicle.speed.toFixed(1)} km/h`
      : 'Speed unavailable'
  const lastUpdated = vehicle.timestamp ? new Date(vehicle.timestamp).toLocaleString() : 'Unknown'
  const ignitionLabel = vehicle.ignition_on ? 'Ignition on' : 'Ignition off'
  const ignitionColor = vehicle.ignition_on ? 'text-red-600' : 'text-emerald-600'
  const canBook = !vehicle.ignition_on && !tripActive
  const availability = canBook
    ? 'Available to book: ignition is off.'
    : tripActive
      ? 'Trip in progress for this vehicle.'
      : 'Unavailable while ignition is on. Try again when the vehicle is idle.'
  return (
    <div className="w-full max-w-[90vw] space-y-3 text-sm sm:w-[260px] sm:max-w-[280px]">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected vehicle</p>
        <p className="text-base font-semibold leading-tight">{vehicle.name}</p>
        <p className="text-xs text-muted-foreground">{vehicle.registration}</p>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          {speedDisplay} &middot; Heading {vehicle.heading ?? '—'}°
        </p>
        <p className={ignitionColor}>{ignitionLabel}</p>
        <p>Updated {lastUpdated}</p>
      </div>
      <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-foreground break-words">
        <p className="font-semibold">Booking status</p>
        <p className="text-muted-foreground">{availability}</p>
      </div>
      <div className="flex justify-center">
        {tripActive ? (
          <Button size="sm" variant="destructive" className="w-full" onClick={onEndTrip}>
            End trip
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full bg-black text-white hover:bg-black/90"
            disabled={!canBook}
            onClick={() => onBookVehicle?.(vehicle)}
          >
            Start booking
          </Button>
        )}
      </div>
    </div>
  )
}

function VehicleMarkerIcon({ heading, selected, color }: { heading: number; selected: boolean; color: string }) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center drop-shadow-lg"
      style={{ transform: `rotate(${heading}deg)` }}
    >
      <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10,4 C10,2.5 11.5,1 16,1 C20.5,1 22,2.5 22,4 L24,10 L24,26 C24,28.5 22.5,30 20,30 L12,30 C9.5,30 8,28.5 8,26 L8,10 L10,4 Z"
          fill={color}
          stroke={selected ? '#0ea5e9' : '#1f2937'}
          strokeWidth={selected ? 0.6 : 0}
        />
        <path d="M11,10 L21,10 L22,24 L10,24 L11,10 Z" fill="#2F80ED" />
        <path d="M12,11 L20,11 L19,16 L13,16 L12,11 Z" fill="#FFFFFF" opacity="0.7" />
        <path d="M13,20 L19,20 L18.5,23 L13.5,23 L13,20 Z" fill="#FFFFFF" opacity="0.7" />
      </svg>
    </div>
  )
}

function buildFallbackMarkerIcon(color: string, heading: number, selected: boolean) {
  const bodyColor = color
  const strokeColor = selected ? '#0ea5e9' : 'transparent'
  const svg = `
    <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading},16,16)">
        <path d="M10,4 C10,2.5 11.5,1 16,1 C20.5,1 22,2.5 22,4 L24,10 L24,26 C24,28.5 22.5,30 20,30 L12,30 C9.5,30 8,28.5 8,26 L8,10 L10,4 Z" fill="${bodyColor}" stroke="${strokeColor}" stroke-width="${selected ? 0.6 : 0}" />
        <path d="M11,10 L21,10 L22,24 L10,24 L11,10 Z" fill="#2F80ED" />
        <path d="M12,11 L20,11 L19,16 L13,16 L12,11 Z" fill="#FFFFFF" opacity="0.7" />
        <path d="M13,20 L19,20 L18.5,23 L13.5,23 L13,20 Z" fill="#FFFFFF" opacity="0.7" />
      </g>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function TrackPin({ label, color }: { label: string; color: string }) {
  return (
    <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 54c-6-8.5-18-17.5-18-30C2 11.85 9.85 4 20 4s18 7.85 18 20c0 12.5-12 21.5-18 30Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="20" cy="22" r="6.5" fill="#ffffff" opacity="0.9" />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {label}
      </text>
    </svg>
  )
}

function buildTrackPinIcon(color: string) {
  const svg = `
    <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 54c-6-8.5-18-17.5-18-30C2 11.85 9.85 4 20 4s18 7.85 18 20c0 12.5-12 21.5-18 30Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="20" cy="22" r="6.5" fill="#ffffff" opacity="0.9" />
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
