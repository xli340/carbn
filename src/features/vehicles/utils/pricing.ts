export const PRICING_CONFIG = {
  baseFare: 15,
  hourlyRate: 18,
  energyFee: 4.5,
}

export interface BookingQuote {
  estimate: number
  durationMinutes: number
}

export function calculateBookingQuote(start: Date, end: Date): BookingQuote {
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const durationHours = durationMinutes / 60
  const estimate = Math.max(
    PRICING_CONFIG.baseFare,
    PRICING_CONFIG.baseFare + PRICING_CONFIG.hourlyRate * durationHours + PRICING_CONFIG.energyFee,
  )

  return {
    estimate: Math.round(estimate * 100) / 100,
    durationMinutes,
  }
}

export function buildDurationLabel(durationMinutes: number) {
  if (durationMinutes < 60) {
    return `${durationMinutes} min`
  }
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (!minutes) {
    return `${hours} h`
  }
  return `${hours} h ${minutes} min`
}
