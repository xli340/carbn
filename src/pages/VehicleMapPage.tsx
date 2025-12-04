import { APIProvider } from '@vis.gl/react-google-maps'
import { useCallback, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/config/env'
import { DEFAULT_MAP_ID } from '@/config/map'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useVehicleSelectionStore } from '@/features/vehicles/stores/vehicle-selection'
import { VehicleMapLayout } from '@/features/vehicles/components/VehicleMapLayout'
import { useVehiclesLiveQuery, useVehicleTrackQuery, vehiclesKeys } from '@/features/vehicles/hooks/useVehicleQueries'
import { useLiveVehicleUpdates } from '@/features/vehicles/hooks/useLiveVehicleUpdates'
import { VehicleHistoryDialog } from '@/features/vehicles/components/VehicleHistoryDialog'
import type { Vehicle, VehicleTrackSearchParams } from '@/features/vehicles/types'

export function VehicleMapPage() {
  const bounds = useVehicleSelectionStore((state) => state.bounds)
  const selectedVehicleId = useVehicleSelectionStore((state) => state.selectedVehicleId)
  const setBounds = useVehicleSelectionStore((state) => state.setBounds)
  const setSelectedVehicleId = useVehicleSelectionStore((state) => state.setSelectedVehicleId)

  const vehiclesQuery = useVehiclesLiveQuery(bounds)
  const [trackParams, setTrackParams] = useState<VehicleTrackSearchParams | null>(null)
  const [trackVehicleId, setTrackVehicleId] = useState<string | null>(null)
  const vehicleTrackQuery = useVehicleTrackQuery(trackVehicleId ?? undefined, trackParams ?? undefined)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyDialogVehicle, setHistoryDialogVehicle] = useState<Vehicle | undefined>(undefined)
  const [showInfoWindow, setShowInfoWindow] = useState(true)

  const vehicles = vehiclesQuery.data?.vehicles ?? []
  const trackPoints = trackVehicleId && trackParams ? vehicleTrackQuery.data?.points ?? [] : []
  const isTrackActive = trackPoints.length > 0
  const token = useAuthStore((state) => state.token)

  useLiveVehicleUpdates({
    vehicleIds: vehicles.map((vehicle) => vehicle.vehicle_id),
    queryKey: vehiclesKeys.live(bounds),
    enabled: Boolean(token),
  })

  const handleSelectVehicle = useCallback(
    (vehicleId?: string) => {
      setSelectedVehicleId(vehicleId)
      setShowInfoWindow(true)
    },
    [setSelectedVehicleId],
  )

  const handleOpenHistory = useCallback((vehicle: Vehicle) => {
    setHistoryDialogVehicle(vehicle)
    setHistoryDialogOpen(true)
    setShowInfoWindow(false)
  }, [])

  const handleSubmitHistory = useCallback(
    (vehicleId: string, params: VehicleTrackSearchParams) => {
      setTrackVehicleId(vehicleId)
      setTrackParams(params)
      setHistoryDialogOpen(false)
    },
    [],
  )

  const handleResetTrack = useCallback(() => {
    setTrackVehicleId(null)
    setTrackParams(null)
    setSelectedVehicleId(undefined)
    setShowInfoWindow(false)
  }, [setSelectedVehicleId])

  const handleDismissInfoWindow = useCallback(() => {
    setShowInfoWindow(false)
  }, [])

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
        isTrackActive={isTrackActive}
        showInfoWindow={showInfoWindow}
        onOpenHistory={handleOpenHistory}
        onResetTrack={handleResetTrack}
        onDismissInfoWindow={handleDismissInfoWindow}
        onBoundsChange={setBounds}
        onSelectVehicle={handleSelectVehicle}
      />
      <VehicleHistoryDialog
        open={historyDialogOpen}
        vehicle={historyDialogVehicle}
        isSubmitting={vehicleTrackQuery.isFetching}
        trackActive={isTrackActive}
        onOpenChange={setHistoryDialogOpen}
        onSubmit={handleSubmitHistory}
        onResetTrack={handleResetTrack}
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
