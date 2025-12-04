import type {
  MapBounds,
  Vehicle,
  VehicleResponse,
  VehicleTrackResponse,
  VehicleTrackSearchParams,
} from '../types'
import { apiRequest } from '@/lib/api-client'

const MAX_LAT_SPAN = 5
const MAX_LNG_SPAN = 6

export async function fetchVehiclesWithinBounds(bounds: MapBounds) {
  const segments = splitBounds(bounds)
  const results = await Promise.all(segments.map(fetchVehiclesWithinBoundsOnce))

  const vehicleMap = new Map<string, Vehicle>()
  for (const result of results) {
    for (const vehicle of result.vehicles) {
      vehicleMap.set(vehicle.vehicle_id, vehicle)
    }
  }

  return {
    vehicles: Array.from(vehicleMap.values()),
    count: vehicleMap.size,
  }
}

async function fetchVehiclesWithinBoundsOnce(bounds: MapBounds) {
  const params = new URLSearchParams({
    swLat: bounds.sw.lat.toString(),
    swLng: bounds.sw.lng.toString(),
    neLat: bounds.ne.lat.toString(),
    neLng: bounds.ne.lng.toString(),
  })

  const response = await apiRequest<VehicleResponse>(
    `/api/v1/fleet/vehicles/live?${params.toString()}`,
  )

  return response.data
}

function splitBounds(bounds: MapBounds): MapBounds[] {
  const latSpan = bounds.ne.lat - bounds.sw.lat
  const lngSpan = bounds.ne.lng - bounds.sw.lng

  const withinLimits = latSpan <= MAX_LAT_SPAN && lngSpan <= MAX_LNG_SPAN
  if (withinLimits) {
    return [bounds]
  }

  if (latSpan > MAX_LAT_SPAN && lngSpan > MAX_LNG_SPAN) {
    const latMid = bounds.sw.lat + latSpan / 2
    const lngMid = bounds.sw.lng + lngSpan / 2
    return [
      { sw: { lat: bounds.sw.lat, lng: bounds.sw.lng }, ne: { lat: latMid, lng: lngMid } },
      { sw: { lat: latMid, lng: bounds.sw.lng }, ne: { lat: bounds.ne.lat, lng: lngMid } },
      { sw: { lat: bounds.sw.lat, lng: lngMid }, ne: { lat: latMid, lng: bounds.ne.lng } },
      { sw: { lat: latMid, lng: lngMid }, ne: { lat: bounds.ne.lat, lng: bounds.ne.lng } },
    ].flatMap(splitBounds)
  }

  if (latSpan > MAX_LAT_SPAN) {
    const latMid = bounds.sw.lat + latSpan / 2
    return [
      { sw: { lat: bounds.sw.lat, lng: bounds.sw.lng }, ne: { lat: latMid, lng: bounds.ne.lng } },
      { sw: { lat: latMid, lng: bounds.sw.lng }, ne: { lat: bounds.ne.lat, lng: bounds.ne.lng } },
    ].flatMap(splitBounds)
  }

  const lngMid = bounds.sw.lng + lngSpan / 2
  return [
    { sw: { lat: bounds.sw.lat, lng: bounds.sw.lng }, ne: { lat: bounds.ne.lat, lng: lngMid } },
    { sw: { lat: bounds.sw.lat, lng: lngMid }, ne: { lat: bounds.ne.lat, lng: bounds.ne.lng } },
  ].flatMap(splitBounds)
}

export async function fetchVehicleTrackHistory(vehicleId: string, params: VehicleTrackSearchParams) {
  const searchParams = new URLSearchParams({
    from: params.from,
  })

  if (params.to) {
    searchParams.set('to', params.to)
  }

  const response = await apiRequest<VehicleTrackResponse>(
    `/api/v1/fleet/vehicles/${vehicleId}/track?${searchParams.toString()}`,
  )

  return response.data
}
