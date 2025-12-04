import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import { AdvancedMarker, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps'
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
  onOpenHistory?: (vehicle: Vehicle) => void
  onDismissInfoWindow?: () => void
  showInfoWindow?: boolean
  isTrackActive?: boolean
  onResetTrack?: () => void
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
  onOpenHistory,
  onDismissInfoWindow,
  showInfoWindow = true,
  isTrackActive,
  onResetTrack,
  fitTrackToView = true,
}: VehicleMapProps) {
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM)

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
  const googleMaps =
    typeof window !== 'undefined'
      ? (window as typeof window & { google?: typeof google }).google
      : undefined

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

  return (
    <div className="relative h-full w-full">
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
        {supportsAdvancedMarkers
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
              return (
                <AdvancedMarker
                  key={vehicle.vehicle_id}
                  position={group.centroid}
                  title={vehicle.registration}
                  onClick={() => onSelectVehicle?.(vehicle.vehicle_id)}
                >
                  <VehicleMarkerIcon heading={heading} selected={vehicle.vehicle_id === selectedVehicleId} />
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
                      googleMaps
                        ? {
                            path: googleMaps.maps.SymbolPath.CIRCLE,
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
              return (
                <Marker
                  key={vehicle.vehicle_id}
                  position={position}
                  icon={
                    googleMaps && googleMaps.maps
                      ? {
                          url: buildFallbackMarkerIcon(isSelected, heading),
                          scaledSize: new googleMaps.maps.Size(32, 32),
                          anchor: new googleMaps.maps.Point(16, 24),
                        }
                      : undefined
                  }
                  onClick={() => onSelectVehicle?.(vehicle.vehicle_id)}
                />
              )
            })}

        {!!trackPoints.length && <VehicleTrackLayer points={trackPoints} fitToPath={fitTrackToView} />}

        {selectedVehicle && showInfoWindow && (
          <InfoWindow
            position={{
              lat: selectedVehicle.lat,
              lng: selectedVehicle.lng,
            }}
            onClose={() => {
              onDismissInfoWindow?.()
            }}
          >
            <VehicleInfo vehicle={selectedVehicle} onOpenHistory={() => onOpenHistory?.(selectedVehicle)} />
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

function VehicleInfo({ vehicle, onOpenHistory }: { vehicle: Vehicle; onOpenHistory: () => void }) {
  const speedDisplay =
    typeof vehicle.speed === 'number' && Number.isFinite(vehicle.speed)
      ? `${vehicle.speed.toFixed(1)} km/h`
      : 'Speed unavailable'
  const lastUpdated = vehicle.timestamp ? new Date(vehicle.timestamp).toLocaleString() : 'Unknown'
  const ignitionLabel = vehicle.ignition_on ? 'Ignition on' : 'Ignition off'
  const ignitionColor = vehicle.ignition_on ? 'text-emerald-600' : 'text-muted-foreground'
  return (
    <div className="min-w-[240px] space-y-3 text-sm">
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
      <div className="flex justify-center">
        <Button
          size="sm"
          className="w-full bg-black text-white hover:bg-black/90"
          onClick={onOpenHistory}
        >
          History
        </Button>
      </div>
    </div>
  )
}

function VehicleMarkerIcon({ heading, selected }: { heading: number; selected: boolean }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center drop-shadow-lg" style={{ transform: `rotate(${heading}deg)` }}>
      <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,4 C10,2.5 11.5,1 16,1 C20.5,1 22,2.5 22,4 L24,10 L24,26 C24,28.5 22.5,30 20,30 L12,30 C9.5,30 8,28.5 8,26 L8,10 L10,4 Z" fill={selected ? '#ef4444' : '#333333'} />
        <path d="M11,10 L21,10 L22,24 L10,24 L11,10 Z" fill="#2F80ED" />
        <path d="M12,11 L20,11 L19,16 L13,16 L12,11 Z" fill="#FFFFFF" opacity="0.7" />
        <path d="M13,20 L19,20 L18.5,23 L13.5,23 L13,20 Z" fill="#FFFFFF" opacity="0.7" />
      </svg>
    </div>
  )
}

function buildFallbackMarkerIcon(selected: boolean, heading: number) {
  const bodyColor = selected ? '#ef4444' : '#333333'
  const svg = `
    <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading},16,16)">
        <path d="M10,4 C10,2.5 11.5,1 16,1 C20.5,1 22,2.5 22,4 L24,10 L24,26 C24,28.5 22.5,30 20,30 L12,30 C9.5,30 8,28.5 8,26 L8,10 L10,4 Z" fill="${bodyColor}" />
        <path d="M11,10 L21,10 L22,24 L10,24 L11,10 Z" fill="#2F80ED" />
        <path d="M12,11 L20,11 L19,16 L13,16 L12,11 Z" fill="#FFFFFF" opacity="0.7" />
        <path d="M13,20 L19,20 L18.5,23 L13.5,23 L13,20 Z" fill="#FFFFFF" opacity="0.7" />
      </g>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
