import { useEffect, useMemo, useRef } from 'react'

import { useQueryClient, type QueryKey } from '@tanstack/react-query'

import { createAuthorizedWebSocket } from '@/lib/websocket'
import { useAuthStore } from '@/features/auth/store/auth-store'
import type { Vehicle, VehiclePositionUpdate } from '../types'

interface UseLiveVehicleUpdatesArgs {
  vehicleIds: string[]
  queryKey: QueryKey
  enabled?: boolean
  onPositionUpdate?: (payload: VehiclePositionUpdate) => void
}

export function useLiveVehicleUpdates({
  vehicleIds,
  queryKey,
  enabled = true,
  onPositionUpdate,
}: UseLiveVehicleUpdatesArgs) {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  const sortedVehicleIds = useMemo(
    () => [...new Set(vehicleIds)].sort(),
    [vehicleIds],
  )
  const socketRef = useRef<WebSocket | null>(null)
  const queryKeyRef = useRef<QueryKey>(queryKey)

  useEffect(() => {
    queryKeyRef.current = queryKey
  }, [queryKey])

  useEffect(() => {
    if (!enabled || !token) {
      return
    }

    const socket = createAuthorizedWebSocket({ token })
    socketRef.current = socket

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as VehiclePositionUpdate & { type: string }
        if (payload.type !== 'position_update') {
          return
        }

        queryClient.setQueryData<{ vehicles: Vehicle[]; count: number } | undefined>(
          queryKeyRef.current,
          (current) => {
            if (!current) {
              return current
            }

            const vehicles = current.vehicles.some(
              (vehicle) => vehicle.vehicle_id === payload.vehicle_id,
            )
              ? current.vehicles.map((vehicle) =>
                  vehicle.vehicle_id === payload.vehicle_id
                    ? {
                        ...vehicle,
                        lat: payload.lat,
                        lng: payload.lng,
                        speed: payload.speed,
                        heading: payload.heading,
                        timestamp: payload.timestamp,
                      }
                    : vehicle,
                )
              : [
                  ...current.vehicles,
                  {
                    vehicle_id: payload.vehicle_id,
                    registration: payload.vehicle_id,
                    name: payload.vehicle_id,
                    lat: payload.lat,
                    lng: payload.lng,
                    speed: payload.speed,
                    heading: payload.heading,
                    ignition_on: true,
                    timestamp: payload.timestamp,
                  },
                ]

            return { ...current, vehicles }
          },
        )

        onPositionUpdate?.({
          vehicle_id: payload.vehicle_id,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
          timestamp: payload.timestamp,
        })
      } catch (error) {
        console.error('[ws] Failed to process payload', error)
      }
    }

    socket.addEventListener('message', handleMessage)

    return () => {
      socket.removeEventListener('message', handleMessage)

      const closeSocket = () => {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
          socket.close()
        }
      }

      if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener('open', closeSocket, { once: true })
      } else {
        closeSocket()
      }

      socketRef.current = null
    }
  }, [enabled, token, queryClient, onPositionUpdate])

  useEffect(() => {
    if (!enabled || !sortedVehicleIds.length) {
      return
    }

    const socket = socketRef.current
    if (!socket) {
      return
    }

    const vehicleIdsToSubscribe = sortedVehicleIds
    const subscribe = () => {
      if (vehicleIdsToSubscribe.length) {
        socket.send(
          JSON.stringify({
            action: 'subscribe',
            vehicle_ids: vehicleIdsToSubscribe,
          }),
        )
      }
    }

    if (socket.readyState === WebSocket.OPEN) {
      subscribe()
    } else {
      socket.addEventListener('open', subscribe, { once: true })
    }

    return () => {
      if (socket.readyState === WebSocket.OPEN && vehicleIdsToSubscribe.length) {
        socket.send(
          JSON.stringify({
            action: 'unsubscribe',
            vehicle_ids: vehicleIdsToSubscribe,
          }),
        )
      }
    }
  }, [enabled, sortedVehicleIds])
}
