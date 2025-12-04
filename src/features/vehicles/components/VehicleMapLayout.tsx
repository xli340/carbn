import type { MapBounds, Vehicle, VehicleTrackPoint } from '../types'

import { Card, CardContent } from '@/components/ui/card'
import { VehicleMap } from './VehicleMap'
import { VehicleList } from './VehicleList'

interface VehicleMapLayoutProps {
  vehicles: Vehicle[]
  trackPoints: VehicleTrackPoint[]
  bounds: MapBounds
  isLoadingVehicles: boolean
  selectedVehicleId?: string
  mapId?: string
  showInfoWindow?: boolean
  isTrackActive?: boolean
  activeTripVehicleId?: string
  hideVehicles?: boolean
  showTrackEndpoints?: boolean
  onSelectVehicle: (vehicleId?: string) => void
  onBookVehicle: (vehicle: Vehicle) => void
  onOpenHistory: (vehicle: Vehicle) => void
  onEndTrip?: () => void
  onResetTrack: () => void
  onDismissInfoWindow: () => void
  onBoundsChange: (bounds: MapBounds) => void
}

export function VehicleMapLayout({
  vehicles,
  trackPoints,
  bounds,
  isLoadingVehicles,
  selectedVehicleId,
  mapId,
  onSelectVehicle,
  onBookVehicle,
  onOpenHistory,
  onEndTrip,
  activeTripVehicleId,
  hideVehicles,
  showTrackEndpoints,
  showInfoWindow,
  isTrackActive,
  onResetTrack,
  onDismissInfoWindow,
  onBoundsChange,
}: VehicleMapLayoutProps) {
  return (
    <div className="space-y-6 w-full">
      <div className="grid min-h-[600px] w-full min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
        <Card className="flex h-full min-h-[560px] min-w-0 flex-col overflow-hidden border border-border/60 shadow-lg shadow-primary/5">
          <CardContent className="h-full p-0">
            <VehicleMap
              vehicles={vehicles}
              bounds={bounds}
              selectedVehicleId={selectedVehicleId}
              trackPoints={trackPoints}
              isLoading={isLoadingVehicles}
              mapId={mapId}
              onBookVehicle={onBookVehicle}
              onDismissInfoWindow={onDismissInfoWindow}
              activeTripVehicleId={activeTripVehicleId}
              hideVehicles={hideVehicles}
              showTrackEndpoints={showTrackEndpoints}
              showInfoWindow={showInfoWindow}
              isTrackActive={isTrackActive}
              onResetTrack={onResetTrack}
              onEndTrip={onEndTrip}
              onBoundsChange={onBoundsChange}
              onSelectVehicle={onSelectVehicle}
            />
          </CardContent>
        </Card>
        <VehicleList
          className="h-full min-h-[560px]"
          vehicles={vehicles}
          isLoading={isLoadingVehicles}
          selectedVehicleId={selectedVehicleId}
          onOpenHistory={onOpenHistory}
          onSelectVehicle={onSelectVehicle}
          tripActive={Boolean(activeTripVehicleId)}
          onEndTrip={onEndTrip}
        />
      </div>
    </div>
  )
}
