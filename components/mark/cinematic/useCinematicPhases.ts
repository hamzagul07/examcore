'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MarkProgressStage } from '@/lib/marking/mark-progress'
import type { CinematicIntensity, CinematicPhase } from './types'

/**
 * The choreography brain.
 *
 * Event-gated, not clock-gated: phases advance on real SSE stage events and the
 * `resultReady` flag, but every phase respects a minimum duration so no
 * animation is ever fast-forwarded. A single low-frequency tick evaluates the
 * transition conditions against elapsed time + the latest inputs (held in refs)
 * which keeps the machine simple and immune to stale-closure bugs.
 *
 * Floor behaviour (per product decision): when the result is ready early, the
 * reading sweep, a short analyzing beat, the buildup and the full climax all
 * still play (~10-12s total) before reveal — but it is never stretched to a
 * full 30s once the result is in.
 */

const TRANSFORM_MS = 300
const READING_MAX_MS = 7000
const TICK_MS = 110

const INTENSITY_BY_PHASE: Record<CinematicPhase, CinematicIntensity> = {
  transform: 'calm',
  reading: 'reading',
  analyzing: 'marking',
  buildup: 'climax',
  climax: 'climax',
  reveal: 'climax',
}

export function useCinematicPhases({
  stage,
  resultReady,
  enabled,
  readingMs = 3800,
  analyzingMinMs = 1500,
  buildupMs = 1800,
}: {
  stage: MarkProgressStage
  resultReady: boolean
  enabled: boolean
  readingMs?: number
  analyzingMinMs?: number
  buildupMs?: number
}) {
  const [phase, setPhase] = useState<CinematicPhase>('transform')

  const phaseRef = useRef<CinematicPhase>('transform')
  const phaseStartRef = useRef<number>(0)
  const stageRef = useRef(stage)
  const resultReadyRef = useRef(resultReady)
  stageRef.current = stage
  resultReadyRef.current = resultReady

  const enter = useCallback((next: CinematicPhase) => {
    phaseRef.current = next
    phaseStartRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    setPhase(next)
  }, [])

  // External signal: the examiner's-hand reveal finished drawing.
  const notifyClimaxDone = useCallback(() => {
    if (phaseRef.current === 'climax') enter('reveal')
  }, [enter])

  useEffect(() => {
    if (!enabled) return
    const now = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    enter('transform')

    const id = setInterval(() => {
      const t = now()
      const elapsed = t - phaseStartRef.current
      const p = phaseRef.current

      switch (p) {
        case 'transform':
          if (elapsed >= TRANSFORM_MS) enter('reading')
          break
        case 'reading':
          if (
            (elapsed >= readingMs && stageRef.current !== 'reading_work') ||
            elapsed >= READING_MAX_MS
          ) {
            enter('analyzing')
          }
          break
        case 'analyzing':
          if (resultReadyRef.current && elapsed >= analyzingMinMs) {
            enter('buildup')
          }
          break
        case 'buildup':
          if (elapsed >= buildupMs) enter('climax')
          break
        case 'climax':
        case 'reveal':
        default:
          break
      }
    }, TICK_MS)

    return () => clearInterval(id)
  }, [enabled, enter, readingMs, analyzingMinMs, buildupMs])

  return {
    phase,
    intensity: INTENSITY_BY_PHASE[phase],
    notifyClimaxDone,
  }
}
