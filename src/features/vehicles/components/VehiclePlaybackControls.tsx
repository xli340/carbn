import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import type { AnimationState } from '../hooks/useVehicleAnimation'

interface VehiclePlaybackControlsProps {
  trackPointsCount: number
  isTrackActive?: boolean
  isAnimationMode: boolean
  animationEnabled: boolean
  animationState: AnimationState
  playbackSpeed: number
  overallProgress: number
  onToggleAnimationMode: (checked: boolean) => void
  onStart: () => void
  onPause: () => void
  onAdjustSpeed: (delta: number) => void
  onExit: () => void
}

export function VehiclePlaybackControls({
  trackPointsCount,
  isTrackActive,
  isAnimationMode,
  animationEnabled,
  animationState,
  playbackSpeed,
  overallProgress,
  onToggleAnimationMode,
  onStart,
  onPause,
  onAdjustSpeed,
  onExit,
}: VehiclePlaybackControlsProps) {
  const statusLabel = useMemo(() => {
    if (animationState === 'running') return 'Playing'
    if (animationState === 'paused') return 'Paused'
    if (animationState === 'completed') return 'Completed'
    return 'Ready'
  }, [animationState])

  if (!trackPointsCount && !isTrackActive) {
    return null
  }

  return (
    <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3 md:top-4 md:bottom-auto md:justify-end md:px-4">
      <div className="touch-overlay flex w-full max-w-[520px] flex-col items-stretch gap-2 select-none md:max-w-[420px] md:items-end">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold leading-none text-foreground">Track playback</p>
            <p className="text-[11px] text-muted-foreground">Choose how to view history</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="track-animation-mode" className="text-[11px] text-muted-foreground">
              Off
            </Label>
            <Switch
              id="track-animation-mode"
              checked={isAnimationMode}
              onCheckedChange={onToggleAnimationMode}
            />
            <Label
              htmlFor="track-animation-mode"
              className="text-[11px] font-medium text-foreground"
            >
              Animation
            </Label>
          </div>
        </div>

        {animationEnabled && (
          <div className="flex w-full flex-col gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Playback progress</span>
                <span className="font-medium text-foreground tabular-nums">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div className="grid w-full grid-cols-5 gap-2 md:gap-3">
              <Button
                size="sm"
                className="h-8 min-w-0 px-2 text-xs"
                onClick={onStart}
                disabled={animationState === 'running'}
              >
                {animationState === 'completed' ? 'Replay' : 'Start'}
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-0 px-2 text-xs"
                variant="secondary"
                onClick={onPause}
                disabled={animationState !== 'running'}
              >
                Pause
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-0 px-2 text-xs"
                variant="secondary"
                onClick={() => onAdjustSpeed(-0.5)}
                disabled={playbackSpeed <= 0.5}
              >
                Slow
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-0 px-2 text-xs"
                variant="secondary"
                onClick={() => onAdjustSpeed(0.5)}
                disabled={playbackSpeed >= 16}
              >
                Fast
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-0 px-2 text-xs"
                variant="destructive"
                onClick={onExit}
              >
                Exit
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Speed {playbackSpeed.toFixed(1)}x</span>
              <span>· {statusLabel}</span>
            </div>
          </div>
        )}

        {!animationEnabled && (
          <div className="pointer-events-auto flex w-full flex-wrap items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-sm md:w-[420px]">
            <Button
              size="sm"
              className="h-8 min-w-0 px-2 text-xs"
              variant="destructive"
              onClick={onExit}
            >
              Exit
            </Button>
            <span className="text-xs text-muted-foreground">Clear current track view</span>
          </div>
        )}
      </div>
    </div>
  )
}
