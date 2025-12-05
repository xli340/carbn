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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parsePositionUpdateMessage(data: unknown): (VehiclePositionUpdate & { type: string }) | null {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    const payload = parsed as Record<string, unknown>
    if (payload.type !== 'position_update') {
      return null
    }
    if (
      typeof payload.vehicle_id !== 'string' ||
      !isFiniteNumber(payload.lat) ||
      !isFiniteNumber(payload.lng) ||
      !isFiniteNumber(payload.speed) ||
      typeof payload.timestamp !== 'string'
    ) {
      return null
    }

    return {
      type: 'position_update',
      vehicle_id: payload.vehicle_id,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      heading: isFiniteNumber(payload.heading) ? payload.heading : 0,
      timestamp: payload.timestamp,
    }
  } catch (error) {
    console.error('[ws] Failed to parse position update', error)
    return null
  }
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
      const payload = parsePositionUpdateMessage(event.data)
      if (!payload) {
        return
      }
      const positionUpdate: VehiclePositionUpdate = {
        vehicle_id: payload.vehicle_id,
        lat: payload.lat,
        lng: payload.lng,
        speed: payload.speed,
        heading: payload.heading,
        timestamp: payload.timestamp,
      }

      queryClient.setQueryData<{ vehicles: Vehicle[]; count: number } | undefined>(
        queryKeyRef.current,
        (current) => {
          if (!current) {
            return current
          }

          const vehicles = current.vehicles.some(
            (vehicle) => vehicle.vehicle_id === positionUpdate.vehicle_id,
          )
            ? current.vehicles.map((vehicle) =>
                vehicle.vehicle_id === positionUpdate.vehicle_id
                  ? {
                      ...vehicle,
                      lat: positionUpdate.lat,
                      lng: positionUpdate.lng,
                      speed: positionUpdate.speed,
                      heading: positionUpdate.heading,
                      timestamp: positionUpdate.timestamp,
                    }
                  : vehicle,
              )
            : [
                ...current.vehicles,
                {
                  vehicle_id: positionUpdate.vehicle_id,
                  registration: positionUpdate.vehicle_id,
                  name: positionUpdate.vehicle_id,
                  lat: positionUpdate.lat,
                  lng: positionUpdate.lng,
                  speed: positionUpdate.speed,
                  heading: positionUpdate.heading,
                  ignition_on: true,
                  timestamp: positionUpdate.timestamp,
                },
              ]

          return { ...current, vehicles }
        },
      )

      onPositionUpdate?.(positionUpdate)
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
