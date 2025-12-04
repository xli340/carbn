import { useQuery } from '@tanstack/react-query'

import { fetchVehicleTrackHistory, fetchVehiclesWithinBounds } from '../api/fleet'
import type { MapBounds } from '../types'

const TRACK_HISTORY_WINDOW = 'now-24h'

export const vehiclesKeys = {
  all: ['vehicles'] as const,
  live: (bounds: MapBounds) => ['vehicles', 'live', bounds] as const,
  track: (vehicleId?: string) => ['vehicles', 'track', vehicleId, TRACK_HISTORY_WINDOW] as const,
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

export function useVehicleTrackQuery(vehicleId: string | undefined) {
  return useQuery({
    queryKey: vehiclesKeys.track(vehicleId),
    queryFn: () => fetchVehicleTrackHistory(vehicleId!, TRACK_HISTORY_WINDOW),
    enabled: Boolean(vehicleId),
    staleTime: 5 * 60 * 1000,
  })
}
