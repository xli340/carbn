import { useQuery } from '@tanstack/react-query'

import { fetchVehicleTrackHistory, fetchVehiclesWithinBounds } from '../api/fleet'
import type { MapBounds, VehicleTrackSearchParams } from '../types'

export const vehiclesKeys = {
  all: ['vehicles'] as const,
  live: (bounds: MapBounds) => ['vehicles', 'live', bounds] as const,
  track: (vehicleId?: string, params?: VehicleTrackSearchParams) =>
    ['vehicles', 'track', vehicleId, params?.from, params?.to] as const,
}

export function useVehiclesLiveQuery(bounds: MapBounds, enabled = true) {
  return useQuery({
    queryKey: vehiclesKeys.live(bounds),
    queryFn: () => fetchVehiclesWithinBounds(bounds),
    enabled,
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useVehicleTrackQuery(vehicleId: string | undefined, params?: VehicleTrackSearchParams) {
  return useQuery({
    queryKey: vehiclesKeys.track(vehicleId, params),
    queryFn: () => {
      if (!vehicleId || !params) {
        throw new Error('Vehicle and time range are required for track history')
      }

      return fetchVehicleTrackHistory(vehicleId, params)
    },
    enabled: Boolean(vehicleId && params?.from),
    staleTime: 5 * 60 * 1000,
  })
}
