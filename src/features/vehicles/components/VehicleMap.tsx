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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/config/map'
import { VEHICLE_MARKER_COLORS } from '../constants'
import { useVehicleAnimation } from '../hooks/useVehicleAnimation'
import { useVehicleClusters } from '../hooks/useVehicleClusters'
import type { MapBounds, Vehicle, VehicleTrackPoint } from '../types'
import { TrackPin } from './TrackPin'
import { VehicleMarker, VehicleMarkerIcon } from './VehicleMarker'
import { VehiclePlaybackControls } from './VehiclePlaybackControls'
import { VehicleTrackLayer } from './VehicleTrackLayer'
import { buildFallbackMarkerIcon, buildTrackPinIcon } from '../utils/map-icons'

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
  const coreLibrary = useMapsLibrary('core')
  const mapInstance = useMap()

  const {
    isAnimationMode,
    animationEnabled,
    animationState,
    playbackSpeed,
    animatedTrail,
    currentAnimatedPoint,
    overallProgress,
    setAnimationMode,
    startAnimation,
    pauseAnimation,
    adjustPlaybackSpeed,
    exitAnimation,
  } = useVehicleAnimation({
    trackPoints,
    onExit: onResetTrack,
  })

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId),
    [selectedVehicleId, vehicles],
  )

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
  const { clusters: groupedVehicles } = useVehicleClusters(vehicles, mapZoom)

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
    if (!animationEnabled || !mapInstance || !currentAnimatedPoint) {
      return
    }
    mapInstance.panTo({ lat: currentAnimatedPoint.lat, lng: currentAnimatedPoint.lng })
  }, [animationEnabled, currentAnimatedPoint, mapInstance])

  const handleToggleAnimationMode = useCallback(
    (checked: boolean) => {
      setAnimationMode(checked)
    },
    [setAnimationMode],
  )

  const markerColorFor = useCallback(
    (vehicle: Vehicle) => {
      if (activeTripVehicleId && vehicle.vehicle_id === activeTripVehicleId) {
        return VEHICLE_MARKER_COLORS.activeTrip
      }
      return vehicle.ignition_on ? VEHICLE_MARKER_COLORS.ignitionOn : VEHICLE_MARKER_COLORS.ignitionOff
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
        <VehiclePlaybackControls
          trackPointsCount={trackPoints.length}
          isTrackActive={isTrackActive}
          isAnimationMode={isAnimationMode}
          animationEnabled={animationEnabled}
          animationState={animationState}
          playbackSpeed={playbackSpeed}
          overallProgress={overallProgress}
          onToggleAnimationMode={handleToggleAnimationMode}
          onStart={startAnimation}
          onPause={pauseAnimation}
          onAdjustSpeed={adjustPlaybackSpeed}
          onExit={exitAnimation}
        />
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
              const markerColor = markerColorFor(vehicle)
              return (
                <VehicleMarker
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  position={group.centroid}
                  supportsAdvancedMarkers
                  coreLibrary={coreLibrary}
                  isSelected={vehicle.vehicle_id === selectedVehicleId}
                  color={markerColor}
                  onSelect={(vehicleId) => onSelectVehicle?.(vehicleId)}
                />
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
                            fillColor: VEHICLE_MARKER_COLORS.clusterFill,
                            fillOpacity: 0.95,
                            strokeColor: VEHICLE_MARKER_COLORS.clusterStroke,
                            strokeWeight: 2,
                          }
                        : undefined
                    }
                    label={{
                      text: String(group.vehicles.length),
                      color: VEHICLE_MARKER_COLORS.clusterStroke,
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
              const markerColor = markerColorFor(vehicle)
              return (
                <VehicleMarker
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  position={position}
                  supportsAdvancedMarkers={false}
                  coreLibrary={coreLibrary}
                  isSelected={vehicle.vehicle_id === selectedVehicleId}
                  color={markerColor}
                  onSelect={(vehicleId) => onSelectVehicle?.(vehicleId)}
                />
              )
            }))} 

        {animationEnabled ? (
          <>
            {animatedTrail.length > 1 && (
              <VehicleTrackLayer
                points={animatedTrail}
                color={VEHICLE_MARKER_COLORS.playbackTrail}
                fitToPath={false}
              />
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
                    color={VEHICLE_MARKER_COLORS.playbackMarker}
                  />
                </AdvancedMarker>
              ) : (
                <Marker
                  position={{ lat: currentAnimatedPoint.lat, lng: currentAnimatedPoint.lng }}
                  icon={
                    coreLibrary
                      ? {
                          url: buildFallbackMarkerIcon(
                            VEHICLE_MARKER_COLORS.playbackMarker,
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
              <VehicleTrackLayer
                points={trackPoints}
                color={VEHICLE_MARKER_COLORS.playbackTrail}
                fitToPath={fitTrackToView}
              />
            )}

            {showTrackEndpoints && trackPoints.length > 0 && (
              <>
                {supportsAdvancedMarkers ? (
                  <>
                    <AdvancedMarker
                      position={{ lat: trackPoints[0].lat, lng: trackPoints[0].lng }}
                      title="Start"
                    >
                      <TrackPin label="Start" color={VEHICLE_MARKER_COLORS.trackStart} />
                    </AdvancedMarker>
                    <AdvancedMarker
                      position={{ lat: trackPoints[trackPoints.length - 1].lat, lng: trackPoints[trackPoints.length - 1].lng }}
                      title="End"
                    >
                      <TrackPin label="End" color={VEHICLE_MARKER_COLORS.trackEnd} />
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
                              url: buildTrackPinIcon(VEHICLE_MARKER_COLORS.trackStart),
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
                              url: buildTrackPinIcon(VEHICLE_MARKER_COLORS.trackEnd),
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
  const hasValidCoordinates = Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)
  const coordinatesLabel = hasValidCoordinates ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}` : 'N/A'
  const ignitionLabel = vehicle.ignition_on ? 'Ignition on' : 'Ignition off'
  const ignitionColor = vehicle.ignition_on ? 'text-red-600' : 'text-emerald-600'
  const canBook = !vehicle.ignition_on && !tripActive
  const availability = canBook
    ? 'Available to book: ignition is off.'
    : tripActive
      ? 'Trip in progress for this vehicle.'
      : 'Unavailable while ignition is on. Try again when the vehicle is idle.'
  const availabilityTone = canBook
    ? 'text-emerald-500 dark:text-emerald-300'
    : tripActive
      ? 'text-amber-500 dark:text-amber-300'
      : 'text-foreground'
  return (
    <div className="w-full max-w-[90vw] space-y-3 text-sm sm:w-[260px] sm:max-w-[280px]">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected vehicle</p>
        <p className="text-base font-semibold leading-tight">{vehicle.name}</p>
        <p className="text-xs text-muted-foreground">{vehicle.registration}</p>
        <p className="text-xs text-muted-foreground break-words">ID: {vehicle.vehicle_id}</p>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          {speedDisplay} &middot; Heading {vehicle.heading ?? '—'}°
        </p>
        <p className={ignitionColor}>{ignitionLabel}</p>
        <p>Updated {lastUpdated}</p>
        <p className="break-words">Location: {coordinatesLabel}</p>
      </div>
      <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-foreground break-words">
        <p className="font-semibold">Booking status</p>
        <p className={availabilityTone}>{availability}</p>
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
