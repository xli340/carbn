import { env } from '@/config/env'
import type { MapBounds } from '@/features/vehicles/types'

export const NEW_ZEALAND_BOUNDS: MapBounds = {
  sw: { lat: -37.25, lng: 174.4 },
  ne: { lat: -36.6, lng: 175.2 },
}

export const DEFAULT_MAP_CENTER = { lat: -36.8485, lng: 174.7633 }
export const DEFAULT_MAP_ZOOM = 11
export const DEFAULT_MAP_ID = env.googleMapId || undefined
