export interface LatLng {
  lat: number
  lng: number
}

export interface MapBounds {
  sw: LatLng
  ne: LatLng
}

export interface Vehicle {
  vehicle_id: string
  registration: string
  name: string
  lat: number
  lng: number
  speed: number
  heading: number
  ignition_on: boolean
  timestamp: string
}

export interface VehicleTrackPoint extends LatLng {
  speed: number
  heading: number
  timestamp: string
}

export interface VehicleTrack {
  vehicle_id: string
  vehicle: {
    registration: string
    name: string
  }
  points: VehicleTrackPoint[]
  point_count: number
}

export interface VehicleResponse {
  success: boolean
  data: {
    vehicles: Vehicle[]
    count: number
  }
}

export interface VehicleTrackResponse {
  success: boolean
  data: VehicleTrack
}

export interface VehiclePositionUpdate extends LatLng {
  vehicle_id: string
  speed: number
  heading: number
  timestamp: string
}
