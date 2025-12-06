import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

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

  const sortedVehicleIds = useMemo(() => [...new Set(vehicleIds)].sort(), [vehicleIds])
  const subscriptionKey = useMemo(() => JSON.stringify(sortedVehicleIds), [sortedVehicleIds])

  const sortedVehicleIdsRef = useRef(sortedVehicleIds)
  const onPositionUpdateRef = useRef(onPositionUpdate)
  const queryKeyRef = useRef<QueryKey>(queryKey)
  const lastSubscriptionKeyRef = useRef<string>('')

  useEffect(() => {
    sortedVehicleIdsRef.current = sortedVehicleIds
  }, [sortedVehicleIds])
  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate
  }, [onPositionUpdate])
  useEffect(() => {
    queryKeyRef.current = queryKey
  }, [queryKey])

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const isUnmountingRef = useRef(false)
  const isConnectingRef = useRef(false)
  const connectRef = useRef<() => void>(() => {})

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const handleMessageReceived = useCallback(
    (payload: VehiclePositionUpdate) => {
      queryClient.setQueryData<{ vehicles: Vehicle[]; count: number } | undefined>(
        queryKeyRef.current,
        (current) => {
          if (!current) return current

          const vehicles = current.vehicles.some((v) => v.vehicle_id === payload.vehicle_id)
            ? current.vehicles.map((v) =>
                v.vehicle_id === payload.vehicle_id
                  ? {
                      ...v,
                      lat: payload.lat,
                      lng: payload.lng,
                      speed: payload.speed,
                      heading: payload.heading,
                      timestamp: payload.timestamp,
                      ignition_on: true,
                    }
                  : v,
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

      if (onPositionUpdateRef.current) {
        onPositionUpdateRef.current(payload)
      }
    },
    [queryClient],
  )

  const connect = useCallback(() => {
    if (!token || isUnmountingRef.current || !enabled) return

    if (isConnectingRef.current || socketRef.current?.readyState === WebSocket.OPEN) return

    isConnectingRef.current = true
    setStatus((prev) => (prev === 'connected' ? prev : 'connecting'))

    if (socketRef.current) {
      socketRef.current.close()
    }

    const socket = createAuthorizedWebSocket({ token })
    socketRef.current = socket

    socket.onopen = () => {
      setStatus('connected')
      retryCountRef.current = 0
      isConnectingRef.current = false

      const ids = sortedVehicleIdsRef.current
      if (ids.length) {
        socket.send(JSON.stringify({ action: 'subscribe', vehicle_ids: ids }))
      }
    }

    socket.onmessage = (event: MessageEvent) => {
      const payload = parsePositionUpdateMessage(event.data)
      if (payload) {
        handleMessageReceived(payload)
      }
    }

    socket.onerror = (error) => {
      console.error('[ws] Socket error:', error)
    }

    socket.onclose = (event) => {
      isConnectingRef.current = false
      socketRef.current = null

      if (isUnmountingRef.current) return

      setStatus('disconnected')

      if (event.code === 4001 || event.code === 4003) {
        return
      }

      setStatus('reconnecting')
      const timeout = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        retryCountRef.current += 1
        connectRef.current()
      }, timeout)
    }
  }, [enabled, handleMessageReceived, token])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    isUnmountingRef.current = false
    let initialTimeout: ReturnType<typeof setTimeout> | null = null

    if (enabled && token) {
      initialTimeout = setTimeout(() => connect(), 0)
    }

    return () => {
      isUnmountingRef.current = true
      if (initialTimeout) {
        clearTimeout(initialTimeout)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      isConnectingRef.current = false
    }
  }, [connect, enabled, token])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !sortedVehicleIds.length) {
      return
    }

    if (lastSubscriptionKeyRef.current === subscriptionKey) {
      return
    }

    socket.send(
      JSON.stringify({
        action: 'subscribe',
        vehicle_ids: sortedVehicleIds,
      }),
    )
    lastSubscriptionKeyRef.current = subscriptionKey

    return () => {
      if (socket.readyState === WebSocket.OPEN && sortedVehicleIds.length) {
        socket.send(
          JSON.stringify({
            action: 'unsubscribe',
            vehicle_ids: sortedVehicleIds,
          }),
        )
      }
    }
  }, [sortedVehicleIds, subscriptionKey])

  return { status }
}
