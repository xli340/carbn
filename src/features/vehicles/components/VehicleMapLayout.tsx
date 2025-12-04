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
  onSelectVehicle: (vehicleId?: string) => void
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
  onBoundsChange,
}: VehicleMapLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="grid min-h-[600px] items-stretch gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
        <Card className="flex h-full min-h-[560px] flex-col overflow-hidden border border-border/60 shadow-lg shadow-primary/5">
          <CardContent className="h-full p-0">
            <VehicleMap
              vehicles={vehicles}
              bounds={bounds}
              selectedVehicleId={selectedVehicleId}
              trackPoints={trackPoints}
              isLoading={isLoadingVehicles}
              mapId={mapId}
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
          onSelectVehicle={onSelectVehicle}
        />
      </div>
    </div>
  )
}
