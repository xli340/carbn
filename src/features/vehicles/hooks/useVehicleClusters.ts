import { useMemo } from 'react'

import type { Vehicle } from '../types'

export type VehicleClusterGroup = {
  centroid: google.maps.LatLngLiteral
  vehicles: Vehicle[]
}

export function clusterRadiusForZoom(zoom: number) {
  if (zoom <= 5) return 1.2
  if (zoom <= 6) return 0.9
  if (zoom <= 7) return 0.6
  if (zoom <= 8) return 0.35
  if (zoom <= 10) return 0.18
  if (zoom <= 12) return 0.09
  if (zoom <= 14) return 0.04
  return 0.02
}

export function useVehicleClusters(vehicles: Vehicle[], zoom: number) {
  const clusterRadius = useMemo(() => clusterRadiusForZoom(zoom), [zoom])

  const clusters = useMemo<VehicleClusterGroup[]>(() => {
    if (!vehicles.length) {
      return []
    }
    const groups: VehicleClusterGroup[] = []
    vehicles.forEach((vehicle) => {
      const existingGroup = groups.find(
        (group) =>
          Math.abs(group.centroid.lat - vehicle.lat) <= clusterRadius &&
          Math.abs(group.centroid.lng - vehicle.lng) <= clusterRadius,
      )

      if (existingGroup) {
        existingGroup.vehicles.push(vehicle)
        const count = existingGroup.vehicles.length
        existingGroup.centroid = {
          lat: existingGroup.centroid.lat + (vehicle.lat - existingGroup.centroid.lat) / count,
          lng: existingGroup.centroid.lng + (vehicle.lng - existingGroup.centroid.lng) / count,
        }
      } else {
        groups.push({
          centroid: { lat: vehicle.lat, lng: vehicle.lng },
          vehicles: [vehicle],
        })
      }
    })

    return groups
  }, [clusterRadius, vehicles])

  return { clusters, clusterRadius }
}
