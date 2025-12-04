import { create } from 'zustand'

import { INITIAL_MAP_BOUNDS } from '../constants'
import type { MapBounds } from '../types'

interface VehicleSelectionState {
  selectedVehicleId?: string
  bounds: MapBounds
  setSelectedVehicleId: (vehicleId?: string) => void
  setBounds: (bounds: MapBounds) => void
}

export const useVehicleSelectionStore = create<VehicleSelectionState>((set) => ({
  bounds: INITIAL_MAP_BOUNDS,
  setSelectedVehicleId(vehicleId) {
    set({ selectedVehicleId: vehicleId })
  },
  setBounds(bounds) {
    set({ bounds })
  },
}))
