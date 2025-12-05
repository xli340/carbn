import { AdvancedMarker, Marker } from '@vis.gl/react-google-maps'

import type { Vehicle } from '../types'
import { buildFallbackMarkerIcon } from '../utils/map-icons'

interface VehicleMarkerProps {
  vehicle: Vehicle
  position: google.maps.LatLngLiteral
  supportsAdvancedMarkers: boolean
  coreLibrary: typeof google.maps | null
  isSelected?: boolean
  color: string
  onSelect?: (vehicleId: string) => void
}

export function VehicleMarker({
  vehicle,
  position,
  supportsAdvancedMarkers,
  coreLibrary,
  isSelected,
  color,
  onSelect,
}: VehicleMarkerProps) {
  const heading = Number.isFinite(vehicle.heading) ? vehicle.heading : 0
  const handleSelect = () => onSelect?.(vehicle.vehicle_id)

  if (supportsAdvancedMarkers) {
    return (
      <AdvancedMarker position={position} title={vehicle.registration} onClick={handleSelect}>
        <VehicleMarkerIcon heading={heading} selected={Boolean(isSelected)} color={color} />
      </AdvancedMarker>
    )
  }

  return (
    <Marker
      position={position}
      icon={
        coreLibrary
          ? {
              url: buildFallbackMarkerIcon(color, heading, Boolean(isSelected)),
              scaledSize: new coreLibrary.Size(32, 32),
              anchor: new coreLibrary.Point(16, 24),
            }
          : undefined
      }
      onClick={handleSelect}
    />
  )
}

export function VehicleMarkerIcon({ heading, selected, color }: { heading: number; selected: boolean; color: string }) {
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
