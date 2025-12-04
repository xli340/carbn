import { LoaderCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Vehicle } from '../types'

interface VehicleListProps {
  vehicles: Vehicle[]
  selectedVehicleId?: string
  isLoading: boolean
  onSelectVehicle: (vehicleId: string) => void
  className?: string
}

export function VehicleList({
  vehicles,
  selectedVehicleId,
  isLoading,
  onSelectVehicle,
  className,
}: VehicleListProps) {
  return (
    <Card className={cn('flex h-full flex-col border-primary/20 shadow-lg shadow-primary/5', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold">Fleet roster</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading vehicles…' : `${vehicles.length} vehicles within the viewport.`}
          </CardDescription>
        </div>
        <Badge variant="secondary" className="whitespace-nowrap text-xs uppercase tracking-wide">
          Live feed
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="flex h-[480px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Syncing with NewStack…
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex h-[480px] flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
            The current map view has no vehicles.
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 px-6 pb-6">
            <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b">
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="hidden xl:table-cell">Location</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => {
                    const isSelected = vehicle.vehicle_id === selectedVehicleId
                    const lastUpdated = new Date(vehicle.timestamp)
                    const speedDisplay =
                      typeof vehicle.speed === 'number' && Number.isFinite(vehicle.speed)
                        ? `${vehicle.speed.toFixed(0)} km/h`
                        : '—'
                    return (
                      <TableRow
                        key={vehicle.vehicle_id}
                        data-state={isSelected ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => onSelectVehicle(vehicle.vehicle_id)}
                      >
                        <TableCell>
                          <div className="font-semibold">{vehicle.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="border-dashed px-2 py-0.5 text-[0.65rem] uppercase">
                              {vehicle.registration}
                            </Badge>
                            <span
                              className={cn(
                                'font-medium',
                                vehicle.ignition_on ? 'text-emerald-500' : 'text-muted-foreground',
                              )}
                            >
                              {vehicle.ignition_on ? 'Active' : 'Idle'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm xl:table-cell">
                          <p className="font-medium">
                            {formatLat(vehicle.lat)} / {formatLng(vehicle.lng)}
                          </p>
                          <p className="text-xs text-muted-foreground">Heading {vehicle.heading}°</p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{speedDisplay}</div>
                          <p className="text-xs text-muted-foreground">Heading {vehicle.heading}°</p>
                        </TableCell>
                        <TableCell className="hidden text-sm lg:table-cell">
                          <p className="font-medium">{formatLastUpdated(lastUpdated)}</p>
                          <p className="text-xs text-muted-foreground">{lastUpdated.toLocaleTimeString()}</p>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecting a row pins the vehicle on the map for closer inspection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatLastUpdated(lastUpdated: Date) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 60000))
  if (diffMinutes < 1) {
    return 'Updated just now'
  }
  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`
  }
  const diffHours = Math.round(diffMinutes / 60)
  return `Updated ${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
}

function formatLat(value: number) {
  const direction = value >= 0 ? 'N' : 'S'
  return `${Math.abs(value).toFixed(3)}°${direction}`
}

function formatLng(value: number) {
  const direction = value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(3)}°${direction}`
}
