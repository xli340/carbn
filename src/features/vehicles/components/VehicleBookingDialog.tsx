import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, CheckCircle2, DollarSign, Timer, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Vehicle } from '../types'
import type { BookingQuote } from '../utils/pricing'
import { PRICING_CONFIG, buildDurationLabel, calculateBookingQuote } from '../utils/pricing'

type BookingStep = 'details' | 'review' | 'success'

interface VehicleBookingDialogProps {
  open: boolean
  vehicle?: Vehicle
  onOpenChange: (open: boolean) => void
  onTripStart?: (vehicle: Vehicle) => void
}

export function VehicleBookingDialog({ open, vehicle, onOpenChange, onTripStart }: VehicleBookingDialogProps) {
  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm px-3 py-6 sm:items-center sm:px-4">
      <BookingDialogContent
        key={vehicle?.vehicle_id ?? 'none'}
        vehicle={vehicle}
        onOpenChange={onOpenChange}
        onTripStart={onTripStart}
      />
    </div>,
    document.body,
  )
}

function BookingDialogContent({
  vehicle,
  onOpenChange,
  onTripStart,
}: {
  vehicle?: Vehicle
  onOpenChange: (open: boolean) => void
  onTripStart?: (vehicle: Vehicle) => void
}) {
  const defaultRange = useMemo(() => buildDefaultRange(), [])
  const [startValue, setStartValue] = useState(defaultRange.start)
  const [endValue, setEndValue] = useState(defaultRange.end)
  const [step, setStep] = useState<BookingStep>('details')
  const [quote, setQuote] = useState<BookingQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [referenceId, setReferenceId] = useState<string | null>(null)

  const durationLabel = quote ? buildDurationLabel(quote.durationMinutes) : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('details')
      setQuote(null)
      setReferenceId(null)
      setError(null)
      setStartValue(defaultRange.start)
      setEndValue(defaultRange.end)
    }
    onOpenChange(nextOpen)
  }

  const handleReviewQuote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!vehicle) {
      setError('Select a vehicle before booking.')
      return
    }

    const fallback = defaultRange
    let startDate = new Date(startValue)
    let endDate = new Date(endValue)

    if (!isValidDate(startDate)) {
      startDate = new Date(fallback.start)
    }
    if (!isValidDate(endDate)) {
      endDate = new Date(fallback.end)
    }

    if (startDate >= endDate) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    }

    setStartValue(formatDateTimeLocal(startDate))
    setEndValue(formatDateTimeLocal(endDate))

    const nextQuote = calculateBookingQuote(startDate, endDate)
    setQuote(nextQuote)
    setStep('review')
    setError(null)
  }

  const handleConfirm = () => {
    if (!vehicle || !quote) return
    onTripStart?.(vehicle)
    setReferenceId(buildReferenceId(vehicle.registration))
    setStep('success')
  }

  return (
    <div className="relative w-full max-w-[340px] min-w-0 max-h-[90vh] overflow-y-auto rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-black/30 sm:max-w-xl sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={() => handleOpenChange(false)}
        className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start justify-between gap-3 pr-12">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Demo booking</p>
          <h3 className="text-lg font-semibold">Book vehicle</h3>
          <p className="text-sm text-muted-foreground">
            Pick a start/end time, review the sample fare, and confirm a mock booking (no real API calls).
          </p>
        </div>
        {vehicle && (
          <Badge variant="outline" className="text-xs uppercase">
            {vehicle.registration}
          </Badge>
        )}
      </div>

      {step === 'details' && (
        <form className="mt-6 space-y-5" onSubmit={handleReviewQuote}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="booking-start">Start time</Label>
              <Input
                id="booking-start"
                type="datetime-local"
                value={startValue}
                className="w-full"
                step={3600}
                onChange={(event) => setStartValue(event.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="booking-end">End time</Label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={endValue}
                className="w-full"
                step={3600}
                onChange={(event) => setEndValue(event.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <span>Next: preview an example fare breakdown for ops review.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={!vehicle}>
                Valuation
              </Button>
            </div>
          </div>
        </form>
      )}

      {step === 'review' && quote && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4 text-primary" />
                Estimated fare
              </div>
              <Badge variant="secondary" className="self-start text-[0.7rem] uppercase">
                Demo only
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold leading-tight">${quote.estimate.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {`${durationLabel} · Assumes base $${PRICING_CONFIG.baseFare} + $${PRICING_CONFIG.hourlyRate}/hr + energy/ops fee $${PRICING_CONFIG.energyFee.toFixed(2)}`}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <BookingSummary label="Start" value={formatReadableDate(startValue)} />
              <BookingSummary label="End" value={formatReadableDate(endValue)} />
              <BookingSummary
                label="Vehicle"
                value={vehicle ? `${vehicle.name} · ${vehicle.registration}` : 'No vehicle selected'}
              />
              <BookingSummary label="Duration" value={durationLabel ?? '—'} />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep('details')}>
              Edit times
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                className="w-full sm:w-auto bg-black text-white hover:bg-black/90"
                onClick={handleConfirm}
                disabled={!vehicle || !quote}
              >
                Confirm & book
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="mt-6 space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-50/70 p-4 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-base font-semibold">Booking complete (demo)</p>
              <p className="text-xs text-emerald-800">
                Ref {referenceId ?? 'pending'} · This flow is illustrative only; no backend calls fired.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Timer className="h-4 w-4 text-primary" />
              Trip summary
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <BookingSummary label="Start" value={formatReadableDate(startValue)} />
              <BookingSummary label="End" value={formatReadableDate(endValue)} />
              <BookingSummary label="Vehicle" value={vehicle ? vehicle.name : 'None selected'} />
              <BookingSummary label="Estimated fare" value={quote ? `$${quote.estimate.toFixed(2)}` : '—'} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-black text-white hover:bg-black/90" onClick={() => handleOpenChange(false)}>
              Back to map
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2">
      <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function buildDefaultRange() {
  const start = new Date(Date.now() + 15 * 60 * 1000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return {
    start: formatDateTimeLocal(start),
    end: formatDateTimeLocal(end),
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

function formatReadableDate(value: string) {
  const date = new Date(value)
  if (!isValidDate(date)) {
    return value
  }
  return date.toLocaleString()
}

function buildReferenceId(registration: string) {
  const normalized = registration.replace(/\s+/g, '').toUpperCase()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${normalized.slice(0, 6)}-${random}`
}
