import { useEffect, useMemo } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

import type { VehicleTrackPoint } from '../types'

interface VehicleTrackLayerProps {
  points: VehicleTrackPoint[]
  color?: string
  fitToPath?: boolean
}

export function VehicleTrackLayer({ points, color = '#ef4444', fitToPath = false }: VehicleTrackLayerProps) {
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

  useEffect(() => {
    if (!map || !fitToPath || !path.length) {
      return
    }

    if (path.length === 1) {
      map.panTo(path[0])
      if (map.getZoom) {
        const currentZoom = map.getZoom() ?? 0
        const targetZoom = Math.max(currentZoom, 14)
        map.setZoom(Math.min(targetZoom, 17))
      }
      return
    }

    const bounds = new google.maps.LatLngBounds()
    path.forEach((point) => bounds.extend(point))
    map.fitBounds(bounds, 100)
  }, [fitToPath, map, path])

  return null
}
