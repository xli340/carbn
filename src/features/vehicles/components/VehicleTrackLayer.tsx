import { useEffect, useMemo } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

import type { VehicleTrackPoint } from '../types'

interface VehicleTrackLayerProps {
  points: VehicleTrackPoint[]
  color?: string
}

export function VehicleTrackLayer({ points, color = '#22c55e' }: VehicleTrackLayerProps) {
  const map = useMap()
  const path = useMemo(
    () => points.map((point) => ({ lat: point.lat, lng: point.lng })),
    [points],
  )

  useEffect(() => {
    if (!map || path.length < 2) {
      return
    }

    const polyline = new google.maps.Polyline({
      path,
      map,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 4,
    })

    return () => {
      polyline.setMap(null)
    }
  }, [map, path, color])

  return null
}
