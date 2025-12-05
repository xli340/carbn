import { NEW_ZEALAND_BOUNDS } from '@/config/map'
import type { MapBounds } from './types'

export const INITIAL_MAP_BOUNDS: MapBounds = NEW_ZEALAND_BOUNDS

export const VEHICLE_MARKER_COLORS = {
  activeTrip: '#fbbf24',
  ignitionOn: '#ef4444',
  ignitionOff: '#111111',
  playbackTrail: '#ef4444',
  playbackMarker: '#111111',
  trackStart: '#10b981',
  trackEnd: '#ef4444',
  clusterFill: '#2563eb',
  clusterStroke: '#ffffff',
}
