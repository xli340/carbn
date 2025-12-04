import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Vehicle } from '../types'

interface VehicleListProps {
  vehicles: Vehicle[]
  trackedVehicle?: Vehicle
  selectedVehicleId?: string
  isLoading: boolean
  onSelectVehicle: (vehicleId: string) => void
  onOpenHistory: (vehicle: Vehicle) => void
  className?: string
  tripActive?: boolean
  onEndTrip?: () => void
  isHistoryTrackActive?: boolean
  onExitTracking?: () => void
}

export function VehicleList({
  vehicles,
  trackedVehicle,
  selectedVehicleId,
  isLoading,
  onSelectVehicle,
  onOpenHistory,
  className,
  tripActive = false,
  onEndTrip,
  isHistoryTrackActive = false,
  onExitTracking,
}: VehicleListProps) {
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [vehicles.length, isLoading, tripActive])

  const displayTrackingVehicle = isHistoryTrackActive ? trackedVehicle : undefined
  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE))
  const pagedVehicles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return vehicles.slice(start, start + PAGE_SIZE)
  }, [page, vehicles])

  return (
    <Card className={cn('flex h-full min-w-0 flex-col border-primary/20 shadow-lg shadow-primary/5', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold">Historical Tracks</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading historical trips…'
              : isHistoryTrackActive && displayTrackingVehicle
                ? `Tracking ${displayTrackingVehicle.name} (${displayTrackingVehicle.registration}).`
                : isHistoryTrackActive
                  ? 'Currently tracking a historical route.'
                : `${vehicles.length} demo trips generated from vehicles in view. Click to replay paths.`}
          </CardDescription>
        </div>
        <Badge variant="secondary" className="whitespace-nowrap text-xs uppercase tracking-wide">
          Route history
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="flex h-[480px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Preparing route playback…
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex h-[480px] flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No historical trips available in the current map view.
          </div>
        ) : tripActive ? (
          <div className="flex h-[480px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
            <p>Trip in progress for a booked vehicle. Historical trips are unavailable until the trip ends.</p>
            <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={onEndTrip}>
              End trip
            </Button>
          </div>
        ) : isHistoryTrackActive ? (
          <div className="flex h-full flex-col gap-4 px-6 pb-6">
            {displayTrackingVehicle && (
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
                <div className="space-y-1 text-left">
                  <p className="font-semibold text-foreground">Tracking: {displayTrackingVehicle.name}</p>
                  <p className="text-xs text-muted-foreground">{displayTrackingVehicle.registration}</p>
                </div>
                <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={() => onExitTracking?.()}>
                  Exit tracking
                </Button>
              </div>
            )}
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <p>Historical trip list is hidden while tracking a route.</p>
              {!displayTrackingVehicle && (
                <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={() => onExitTracking?.()}>
                  Exit tracking
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 px-6 pb-6">
            <div className="flex flex-col gap-3">
              {pagedVehicles.map((vehicle) => {
                const isSelected = vehicle.vehicle_id === selectedVehicleId
                return (
                  <div
                    key={vehicle.vehicle_id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition-colors',
                      isSelected && 'bg-muted',
                    )}
                    onClick={() => {
                      if (vehicle.ignition_on) return
                      onSelectVehicle(vehicle.vehicle_id)
                      onOpenHistory(vehicle)
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold">{vehicle.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-dashed px-2 py-0.5 text-[0.65rem] uppercase">
                            {vehicle.registration}
                          </Badge>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                              vehicle.ignition_on ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700',
                            )}
                          >
                            {vehicle.ignition_on ? 'In progress' : 'Completed'}
                          </span>
                        </div>
                      </div>
                      {!vehicle.ignition_on && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectVehicle(vehicle.vehicle_id)
                            onOpenHistory(vehicle)
                          }}
                          aria-label="View track"
                          className="sm:w-auto w-full sm:max-w-[140px]"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <PaginationNav
              page={page}
              totalPages={totalPages}
              totalItems={vehicles.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
            <p className="text-xs text-muted-foreground">
              Assumption: vehicles in view stand in for recent trips; ignition state indicates whether a trip is in
              progress; click to open demo track playback.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PaginationNav({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Prev
        </Button>
        <span className="text-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
