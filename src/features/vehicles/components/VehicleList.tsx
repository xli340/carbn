import { LoaderCircle, MoreVertical, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Vehicle } from '../types'

interface VehicleListProps {
  vehicles: Vehicle[]
  selectedVehicleId?: string
  isLoading: boolean
  onSelectVehicle: (vehicleId: string) => void
  onOpenHistory: (vehicle: Vehicle) => void
  className?: string
}

export function VehicleList({
  vehicles,
  selectedVehicleId,
  isLoading,
  onSelectVehicle,
  onOpenHistory,
  className,
}: VehicleListProps) {
  const [actionVehicle, setActionVehicle] = useState<Vehicle | null>(null)

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
                    <TableHead>Name</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Ignition</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => {
                    const isSelected = vehicle.vehicle_id === selectedVehicleId
                    return (
                      <TableRow
                        key={vehicle.vehicle_id}
                        data-state={isSelected ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => onSelectVehicle(vehicle.vehicle_id)}
                      >
                        <TableCell>
                          <div className="font-semibold">{vehicle.name}</div>
                          <p className="text-xs text-muted-foreground">
                            {formatLastUpdated(new Date(vehicle.timestamp))}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-dashed px-2 py-0.5 text-[0.65rem] uppercase">
                            {vehicle.registration}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                              vehicle.ignition_on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700',
                            )}
                          >
                            {vehicle.ignition_on ? 'On' : 'Off'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation()
                              setActionVehicle(vehicle)
                            }}
                            aria-label="More actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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
      {actionVehicle && (
        <CenteredActionDialog
          vehicle={actionVehicle}
          onClose={() => setActionVehicle(null)}
          onOpenHistory={() => {
            onOpenHistory(actionVehicle)
            setActionVehicle(null)
          }}
          onCenter={() => {
            onSelectVehicle(actionVehicle.vehicle_id)
            setActionVehicle(null)
          }}
        />
      )}
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

function CenteredActionDialog({
  vehicle,
  onClose,
  onOpenHistory,
  onCenter,
}: {
  vehicle: Vehicle
  onClose: () => void
  onOpenHistory: () => void
  onCenter: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/30">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-3 pr-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Vehicle details</h3>
              <p className="text-sm text-muted-foreground">{vehicle.name}</p>
              <p className="text-xs text-muted-foreground">
                Heading {vehicle.heading}° &middot; {formatLat(vehicle.lat)} / {formatLng(vehicle.lng)}
              </p>
            </div>
            <Badge variant="outline" className="mt-1 text-xs uppercase">
              {vehicle.registration}
            </Badge>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Button variant="outline" className="w-full" onClick={onCenter}>
              Center on map
            </Button>
            <Button className="w-full bg-black text-white hover:bg-black/90" onClick={onOpenHistory}>
              History
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
