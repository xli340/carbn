import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { VehicleTrackPoint } from '../types'

export type AnimationState = 'idle' | 'running' | 'paused' | 'completed'

const MIN_SEGMENT_DURATION_MS = 180
const MAX_SEGMENT_DURATION_MS = 3200
const FALLBACK_SEGMENT_DURATION_MS = 800

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeHeadingDegrees(heading: number) {
  return (heading % 360 + 360) % 360
}

function shortestHeadingDelta(from: number, to: number) {
  const delta = normalizeHeadingDegrees(to) - normalizeHeadingDegrees(from)
  return (((delta + 540) % 360) - 180)
}

function headingFromPoints(a: VehicleTrackPoint, b: VehicleTrackPoint) {
  const rad = Math.atan2(b.lng - a.lng, b.lat - a.lat)
  return normalizeHeadingDegrees((rad * 180) / Math.PI)
}

function buildTrackSegments(trackPoints: VehicleTrackPoint[]) {
  if (trackPoints.length < 2) {
    return []
  }

  return trackPoints.slice(0, -1).map((point, index) => {
    const next = trackPoints[index + 1]
    const startTs = new Date(point.timestamp).getTime()
    const endTs = new Date(next.timestamp).getTime()
    const rawDuration = endTs - startTs
    const durationMs =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? clamp(rawDuration, MIN_SEGMENT_DURATION_MS, MAX_SEGMENT_DURATION_MS)
        : FALLBACK_SEGMENT_DURATION_MS

    return { from: point, to: next, durationMs }
  })
}

interface UseVehicleAnimationArgs {
  trackPoints: VehicleTrackPoint[]
  onExit?: () => void
}

export function useVehicleAnimation({ trackPoints, onExit }: UseVehicleAnimationArgs) {
  const [isAnimationMode, setIsAnimationMode] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [interpolatedPoint, setInterpolatedPoint] = useState<VehicleTrackPoint | null>(null)
  const [overallProgress, setOverallProgress] = useState(0)
  const animationFrameRef = useRef<number | null>(null)
  const segmentIndexRef = useRef(0)
  const segmentStartTimeRef = useRef(0)
  const pausedProgressRef = useRef(0)
  const speedRef = useRef(playbackSpeed)

  const animationEnabled = isAnimationMode && trackPoints.length > 0

  useEffect(() => {
    speedRef.current = playbackSpeed
  }, [playbackSpeed])

  const trackSegments = useMemo(
    () => buildTrackSegments(trackPoints),
    [trackPoints],
  )

  const { totalTrackDurationMs, segmentStartOffsets } = useMemo(
    () =>
      trackSegments.reduce(
        (accumulator, segment) => ({
          totalTrackDurationMs: accumulator.totalTrackDurationMs + segment.durationMs,
          segmentStartOffsets: [...accumulator.segmentStartOffsets, accumulator.totalTrackDurationMs],
        }),
        { totalTrackDurationMs: 0, segmentStartOffsets: [] as number[] },
      ),
    [trackSegments],
  )

  const currentAnimatedPoint = useMemo(() => {
    if (!animationEnabled) return null
    if (interpolatedPoint) return interpolatedPoint
    const clampedIndex = Math.min(playbackIndex, trackPoints.length - 1)
    return trackPoints[clampedIndex]
  }, [animationEnabled, interpolatedPoint, playbackIndex, trackPoints])

  const animatedTrail = useMemo(() => {
    if (!animationEnabled) return []
    const endIndex = Math.min(playbackIndex + 1, trackPoints.length)
    const trail = trackPoints.slice(0, endIndex)
    if (interpolatedPoint) {
      const lastPoint = trail[trail.length - 1]
      if (!lastPoint || lastPoint.lat !== interpolatedPoint.lat || lastPoint.lng !== interpolatedPoint.lng) {
        trail.push(interpolatedPoint)
      }
    }
    return trail
  }, [animationEnabled, interpolatedPoint, playbackIndex, trackPoints])

  const cancelAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  useEffect(() => cancelAnimationLoop, [cancelAnimationLoop])

  useEffect(() => {
    if (!animationEnabled || animationState !== 'running' || !trackSegments.length) {
      return
    }

    segmentIndexRef.current = clamp(segmentIndexRef.current, 0, trackSegments.length - 1)

    const step = (now: number) => {
      const currentSegment = trackSegments[segmentIndexRef.current]
      if (!currentSegment) {
        setInterpolatedPoint(trackPoints[trackPoints.length - 1] ?? null)
        setPlaybackIndex(trackPoints.length - 1)
        setAnimationState('completed')
        return
      }

      const effectiveDuration = Math.max(
        80,
        currentSegment.durationMs / Math.max(speedRef.current, 0.1),
      )
      const elapsed = now - segmentStartTimeRef.current
      const t = Math.min(elapsed / effectiveDuration, 1)

      const headingStart = Number.isFinite(currentSegment.from.heading)
        ? currentSegment.from.heading
        : headingFromPoints(currentSegment.from, currentSegment.to)
      const headingEnd = Number.isFinite(currentSegment.to.heading)
        ? currentSegment.to.heading
        : headingFromPoints(currentSegment.from, currentSegment.to)
      const interpolatedHeading = normalizeHeadingDegrees(
        headingStart + shortestHeadingDelta(headingStart, headingEnd) * t,
      )

      const interpolatedSpeed =
        currentSegment.from.speed + (currentSegment.to.speed - currentSegment.from.speed) * t

      const nextPoint: VehicleTrackPoint = {
        lat: currentSegment.from.lat + (currentSegment.to.lat - currentSegment.from.lat) * t,
        lng: currentSegment.from.lng + (currentSegment.to.lng - currentSegment.from.lng) * t,
        heading: interpolatedHeading,
        speed: interpolatedSpeed,
        timestamp: currentSegment.from.timestamp,
      }

      setInterpolatedPoint(nextPoint)
      pausedProgressRef.current = elapsed
      const segmentStart = segmentStartOffsets[segmentIndexRef.current] ?? 0
      const completedMs = segmentStart + currentSegment.durationMs * Math.min(t, 1)
      const ratio = completedMs / totalTrackDurationMs
      if (Number.isFinite(ratio)) {
        setOverallProgress(Math.max(0, Math.min(100, ratio * 100)))
      }

      if (t >= 1) {
        const overshoot = Math.max(0, elapsed - effectiveDuration)
        segmentIndexRef.current += 1
        setPlaybackIndex(segmentIndexRef.current)
        pausedProgressRef.current = 0

        if (segmentIndexRef.current >= trackSegments.length) {
          setInterpolatedPoint(trackPoints[trackPoints.length - 1] ?? null)
          setAnimationState('completed')
          setOverallProgress(100)
          return
        }

        segmentStartTimeRef.current = now - overshoot
      }

      animationFrameRef.current = window.requestAnimationFrame(step)
    }

    segmentStartTimeRef.current = performance.now() - pausedProgressRef.current
    animationFrameRef.current = window.requestAnimationFrame(step)

    return () => {
      cancelAnimationLoop()
    }
  }, [animationEnabled, animationState, cancelAnimationLoop, segmentStartOffsets, totalTrackDurationMs, trackSegments, trackPoints])

  useEffect(() => {
    if (!animationEnabled) {
      cancelAnimationLoop()
      segmentIndexRef.current = 0
      pausedProgressRef.current = 0
      segmentStartTimeRef.current = 0
    }
  }, [animationEnabled, cancelAnimationLoop])

  const startAnimation = useCallback(() => {
    if (!trackPoints.length) return
    if (trackPoints.length <= 1) {
      setPlaybackIndex(trackPoints.length - 1)
      setAnimationState('completed')
      setOverallProgress(100)
      return
    }
    if (animationState === 'completed' || animationState === 'idle') {
      segmentIndexRef.current = 0
      pausedProgressRef.current = 0
      segmentStartTimeRef.current = 0
      setPlaybackIndex(0)
      setInterpolatedPoint(trackPoints[0])
      setOverallProgress(0)
    }
    setAnimationState('running')
  }, [animationState, trackPoints])

  const pauseAnimation = useCallback(() => {
    if (animationState === 'running') {
      setAnimationState('paused')
    }
  }, [animationState])

  const resetAnimation = useCallback(() => {
    cancelAnimationLoop()
    setAnimationState('idle')
    setPlaybackIndex(0)
    setPlaybackSpeed(1)
    setInterpolatedPoint(null)
    setOverallProgress(0)
    segmentIndexRef.current = 0
    pausedProgressRef.current = 0
    segmentStartTimeRef.current = 0
  }, [cancelAnimationLoop])

  const setAnimationMode = useCallback(
    (checked: boolean) => {
      setIsAnimationMode(checked)
      resetAnimation()
    },
    [resetAnimation],
  )

  const adjustPlaybackSpeed = useCallback((delta: number) => {
    setPlaybackSpeed((current) => {
      const next = Math.min(Math.max(0.5, Number((current + delta).toFixed(1))), 16)
      return next
    })
  }, [])

  const exitAnimation = useCallback(() => {
    setIsAnimationMode(false)
    resetAnimation()
    onExit?.()
  }, [onExit, resetAnimation])

  return {
    isAnimationMode,
    animationEnabled,
    animationState,
    playbackSpeed,
    playbackIndex,
    interpolatedPoint,
    animatedTrail,
    overallProgress,
    currentAnimatedPoint,
    startAnimation,
    pauseAnimation,
    adjustPlaybackSpeed,
    setAnimationMode,
    exitAnimation,
  }
}
