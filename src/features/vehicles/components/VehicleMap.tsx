import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import {
  AdvancedMarker,
  InfoWindow,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { LoaderCircle, X } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
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
  const coreLibrary = useMapsLibrary('core')

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
  const mapInstance = useMap()

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

  const markerColorFor = useCallback(
    (vehicle: Vehicle) => {
      if (activeTripVehicleId && vehicle.vehicle_id === activeTripVehicleId) {
        return '#fbbf24'
      }
      return vehicle.ignition_on ? '#ef4444' : '#111111'
    },
    [activeTripVehicleId],
  )

  return (
    <div className="relative h-full w-full min-w-0">
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

        {!!trackPoints.length && <VehicleTrackLayer points={trackPoints} fitToPath={fitTrackToView} />}

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

      {isTrackActive && onResetTrack && (
        <div className="absolute right-4 top-4 z-10">
          <Button
            size="sm"
            className="bg-black text-white hover:bg-black/90"
            variant="secondary"
            onClick={onResetTrack}
          >
            <X className="mr-2 h-4 w-4" />
            Reset track
          </Button>
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
