import { APIProvider } from '@vis.gl/react-google-maps'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/config/env'
import { DEFAULT_MAP_ID } from '@/config/map'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useVehicleSelectionStore } from '@/features/vehicles/stores/vehicle-selection'
import { VehicleMapLayout } from '@/features/vehicles/components/VehicleMapLayout'
import { useVehiclesLiveQuery, useVehicleTrackQuery, vehiclesKeys } from '@/features/vehicles/hooks/useVehicleQueries'
import { useLiveVehicleUpdates } from '@/features/vehicles/hooks/useLiveVehicleUpdates'

export function VehicleMapPage() {
  const bounds = useVehicleSelectionStore((state) => state.bounds)
  const selectedVehicleId = useVehicleSelectionStore((state) => state.selectedVehicleId)
  const setBounds = useVehicleSelectionStore((state) => state.setBounds)
  const setSelectedVehicleId = useVehicleSelectionStore((state) => state.setSelectedVehicleId)

  const vehiclesQuery = useVehiclesLiveQuery(bounds)
  const vehicleTrackQuery = useVehicleTrackQuery(selectedVehicleId)

  const vehicles = vehiclesQuery.data?.vehicles ?? []
  const trackPoints = vehicleTrackQuery.data?.points ?? []
  const token = useAuthStore((state) => state.token)

  useLiveVehicleUpdates({
    vehicleIds: vehicles.map((vehicle) => vehicle.vehicle_id),
    queryKey: vehiclesKeys.live(bounds),
    enabled: Boolean(token),
  })

  if (!env.googleMapsApiKey) {
    return <MissingGoogleMapsKeyNotice />
  }

  return (
    <APIProvider apiKey={env.googleMapsApiKey} solutionChannel="GMP_carbn_fleet_scaffold">
      <VehicleMapLayout
        vehicles={vehicles}
        bounds={bounds}
        trackPoints={trackPoints}
        selectedVehicleId={selectedVehicleId}
        isLoadingVehicles={vehiclesQuery.isLoading}
        mapId={DEFAULT_MAP_ID}
        onBoundsChange={setBounds}
        onSelectVehicle={setSelectedVehicleId}
      />
    </APIProvider>
  )
}

function MissingGoogleMapsKeyNotice() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Google Maps API key missing</CardTitle>
        <CardDescription>
          Provide <code className="rounded bg-muted px-2 py-1 text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in
          your <span className="font-semibold">.env</span> file to render the live fleet map.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Until the API key is available we&apos;ll skip loading the Maps SDK, but all other data fetching
        hooks and stores are ready to use.
      </CardContent>
    </Card>
  )
}
