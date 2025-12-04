import { APIProvider } from '@vis.gl/react-google-maps'
import { useCallback, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/config/env'
import { DEFAULT_MAP_ID } from '@/config/map'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useVehicleSelectionStore } from '@/features/vehicles/stores/vehicle-selection'
import { VehicleMapLayout } from '@/features/vehicles/components/VehicleMapLayout'
import { VehicleBookingDialog } from '@/features/vehicles/components/VehicleBookingDialog'
import { useVehiclesLiveQuery, useVehicleTrackQuery, vehiclesKeys } from '@/features/vehicles/hooks/useVehicleQueries'
import { useLiveVehicleUpdates } from '@/features/vehicles/hooks/useLiveVehicleUpdates'
import { VehicleHistoryDialog } from '@/features/vehicles/components/VehicleHistoryDialog'
import type { Vehicle, VehicleTrackPoint, VehicleTrackSearchParams } from '@/features/vehicles/types'

export function VehicleMapPage() {
  const bounds = useVehicleSelectionStore((state) => state.bounds)
  const selectedVehicleId = useVehicleSelectionStore((state) => state.selectedVehicleId)
  const setBounds = useVehicleSelectionStore((state) => state.setBounds)
  const setSelectedVehicleId = useVehicleSelectionStore((state) => state.setSelectedVehicleId)

  const vehiclesQuery = useVehiclesLiveQuery(bounds)
  const [trackParams, setTrackParams] = useState<VehicleTrackSearchParams | null>(null)
  const [trackVehicleId, setTrackVehicleId] = useState<string | null>(null)
  const [trackedVehicleInfo, setTrackedVehicleInfo] = useState<Vehicle | undefined>(undefined)
  const vehicleTrackQuery = useVehicleTrackQuery(trackVehicleId ?? undefined, trackParams ?? undefined)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyDialogVehicle, setHistoryDialogVehicle] = useState<Vehicle | undefined>(undefined)
  const [showInfoWindow, setShowInfoWindow] = useState(true)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | undefined>(undefined)
  const [activeTripVehicleId, setActiveTripVehicleId] = useState<string | null>(null)
  const [liveTripTrackPoints, setLiveTripTrackPoints] = useState<VehicleTrackPoint[]>([])

  const vehicles = vehiclesQuery.data?.vehicles ?? []
  const trackPoints = trackVehicleId && trackParams ? vehicleTrackQuery.data?.points ?? [] : []
  const isLiveTripActive = Boolean(activeTripVehicleId)
  const displayedTrackPoints = isLiveTripActive ? liveTripTrackPoints : trackPoints
  const isTrackActive = displayedTrackPoints.length > 0
  const isHistoryTrackActive = !isLiveTripActive && Boolean(trackVehicleId && trackParams && trackPoints.length)
  const token = useAuthStore((state) => state.token)
  const trackedVehicle =
    trackVehicleId && !isLiveTripActive
      ? trackedVehicleInfo ||
        vehicles.find((vehicle) => vehicle.vehicle_id === trackVehicleId) ||
        historyDialogVehicle
      : undefined
  const vehiclesForList =
    isHistoryTrackActive && trackedVehicle ? [trackedVehicle] : vehicles

  const handleLivePosition = useCallback(
    (payload: VehicleTrackPoint & { vehicle_id: string }) => {
      if (activeTripVehicleId && payload.vehicle_id === activeTripVehicleId) {
        setLiveTripTrackPoints((current) => [
          ...current,
          {
            lat: payload.lat,
            lng: payload.lng,
            speed: payload.speed,
            heading: payload.heading,
            timestamp: payload.timestamp,
          },
        ])
      }
    },
    [activeTripVehicleId],
  )

  useLiveVehicleUpdates({
    vehicleIds: isLiveTripActive && activeTripVehicleId ? [activeTripVehicleId] : vehicles.map((vehicle) => vehicle.vehicle_id),
    queryKey: vehiclesKeys.live(bounds),
    enabled: Boolean(token),
    onPositionUpdate: handleLivePosition,
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
      const vehicle = vehicles.find((v) => v.vehicle_id === vehicleId) || historyDialogVehicle
      setTrackedVehicleInfo(vehicle)
      setTrackParams(params)
      setHistoryDialogOpen(false)
    },
    [historyDialogVehicle, vehicles],
  )

  const handleResetTrack = useCallback(() => {
    setTrackVehicleId(null)
    setTrackParams(null)
    setTrackedVehicleInfo(undefined)
    setSelectedVehicleId(undefined)
    setShowInfoWindow(false)
    setLiveTripTrackPoints([])
  }, [setSelectedVehicleId])

  const handleDismissInfoWindow = useCallback(() => {
    setShowInfoWindow(false)
  }, [])

  const handleBookVehicle = useCallback(
    (vehicle: Vehicle) => {
      setBookingVehicle(vehicle)
      setBookingDialogOpen(true)
      setSelectedVehicleId(vehicle.vehicle_id)
      setShowInfoWindow(true)
    },
    [setSelectedVehicleId],
  )

  const handleTripStart = useCallback(
    (vehicle: Vehicle) => {
      setActiveTripVehicleId(vehicle.vehicle_id)
      setLiveTripTrackPoints([])
      setTrackVehicleId(null)
      setTrackParams(null)
      setTrackedVehicleInfo(undefined)
      setHistoryDialogOpen(false)
      setShowInfoWindow(true)
    },
    [],
  )

  const handleEndTrip = useCallback(() => {
    setActiveTripVehicleId(null)
    setLiveTripTrackPoints([])
    setShowInfoWindow(false)
    setSelectedVehicleId(undefined)
    vehiclesQuery.refetch()
  }, [vehiclesQuery])

  const handleBookingOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setBookingVehicle(undefined)
      setShowInfoWindow(false)
    }
    setBookingDialogOpen(open)
  }, [])

  if (!env.googleMapsApiKey) {
    return <MissingGoogleMapsKeyNotice />
  }

  return (
    <APIProvider apiKey={env.googleMapsApiKey} solutionChannel="GMP_carbn_fleet_scaffold">
      <VehicleMapLayout
        vehicles={
          isLiveTripActive && activeTripVehicleId
            ? (() => {
                const filtered = vehicles.filter((v) => v.vehicle_id === activeTripVehicleId)
                if (filtered.length) return filtered
                return bookingVehicle && bookingVehicle.vehicle_id === activeTripVehicleId ? [bookingVehicle] : []
              })()
            : vehicles
        }
        bounds={bounds}
        trackPoints={displayedTrackPoints}
        selectedVehicleId={selectedVehicleId}
        isLoadingVehicles={vehiclesQuery.isLoading}
        mapId={DEFAULT_MAP_ID}
        isTrackActive={isTrackActive}
        hideVehicles={isHistoryTrackActive}
        showTrackEndpoints={isHistoryTrackActive}
        showInfoWindow={showInfoWindow}
        isHistoryTrackActive={isHistoryTrackActive}
        onBookVehicle={handleBookVehicle}
        onOpenHistory={handleOpenHistory}
        onResetTrack={handleResetTrack}
        activeTripVehicleId={activeTripVehicleId || undefined}
        onEndTrip={handleEndTrip}
        onDismissInfoWindow={handleDismissInfoWindow}
        onBoundsChange={setBounds}
        onSelectVehicle={handleSelectVehicle}
        vehiclesForList={vehiclesForList}
        onExitTracking={handleResetTrack}
        trackedVehicle={trackedVehicle}
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
      <VehicleBookingDialog
        open={bookingDialogOpen}
        vehicle={bookingVehicle}
        onOpenChange={handleBookingOpenChange}
        onTripStart={handleTripStart}
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
