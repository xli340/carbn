import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { Clock3, History, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Vehicle, VehicleTrackSearchParams } from '../types'

interface VehicleHistoryDialogProps {
  open: boolean
  vehicle?: Vehicle
  isSubmitting?: boolean
  trackActive?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (vehicleId: string, params: VehicleTrackSearchParams) => void
  onResetTrack: () => void
}

const QUICK_PRESETS = [
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
]

export function VehicleHistoryDialog({
  open,
  vehicle,
  isSubmitting,
  trackActive,
  onOpenChange,
  onSubmit,
  onResetTrack,
}: VehicleHistoryDialogProps) {
  const [fromValue, setFromValue] = useState(buildRangeHours(1).from)
  const [toValue, setToValue] = useState(buildRangeHours(1).to)
  const [error, setError] = useState<string | null>(null)
  const [activePresetHours, setActivePresetHours] = useState<number | null>(1)

  const rangeSummary = useMemo(() => {
    if (!vehicle) return 'Select a historical trip to view its path.'
    return `Pick a window to replay ${vehicle.registration} on the map.`
  }, [vehicle])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const nextRange = buildRangeHours(1)
      setFromValue(nextRange.from)
      setToValue(nextRange.to)
      setError(null)
      setActivePresetHours(1)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!vehicle) {
      setError('Pick a vehicle first.')
      return
    }

    const fromDate = new Date(fromValue)
    const toDate = new Date(toValue)

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      setError('Please provide valid start and end times.')
      return
    }
    if (fromDate >= toDate) {
      setError('Start time must be before the end time.')
      return
    }

    setError(null)
    onSubmit(vehicle.vehicle_id, { from: fromDate.toISOString(), to: toDate.toISOString() })
    onOpenChange(false)
  }

  const handlePreset = (hours: number) => {
    const nextRange = buildRangeHours(hours)
    setFromValue(nextRange.from)
    setToValue(nextRange.to)
    setActivePresetHours(hours)
    setError(null)
  }

  const handleResetTrack = () => {
    onResetTrack()
    onOpenChange(false)
  }

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm px-3 py-6 sm:items-center sm:px-4">
      <div className="relative w-full max-w-[420px] min-w-0 max-h-[90vh] overflow-y-auto rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-black/30 sm:max-w-3xl sm:p-6">
        <button
          type="button"
          aria-label="Close"
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-1 pr-12">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Track history</h3>
            </div>
            {vehicle && (
              <Badge variant="outline" className="text-xs uppercase">
                {vehicle.registration}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{rangeSummary}</p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quick presets</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={activePresetHours === preset.hours ? 'default' : 'outline'}
                size="sm"
                className={activePresetHours === preset.hours ? 'bg-black text-white hover:bg-black/90' : undefined}
                onClick={() => handlePreset(preset.hours)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="history-from">Start</Label>
              <Input
                id="history-from"
                type="datetime-local"
                value={fromValue}
                max={toValue}
                className="w-full"
                step={3600}
                onChange={(event) => {
                  setFromValue(event.target.value)
                  setActivePresetHours(null)
                }}
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="history-to">End</Label>
              <Input
                id="history-to"
                type="datetime-local"
                value={toValue}
                min={fromValue}
                className="w-full"
                step={3600}
                onChange={(event) => {
                  setToValue(event.target.value)
                  setActivePresetHours(null)
                }}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={vehicle?.ignition_on ? 'default' : 'secondary'}>
                {vehicle?.ignition_on ? 'Ignition on' : 'Ignition off'}
              </Badge>
              {trackActive && (
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  className="border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                  onClick={handleResetTrack}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear track
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!vehicle || isSubmitting}
                className="bg-black text-white hover:bg-black/90"
              >
                {isSubmitting ? 'Loading…' : 'View'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function buildRangeHours(hours: number) {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000)
  return {
    from: formatDateTimeLocal(from),
    to: formatDateTimeLocal(now),
  }
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function isValidDate(value: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}
