'use client'

import { useEffect, useState } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { RoadmapTodaySummary } from '@/lib/plan/roadmap-types'
import { fetchTodaySummary } from '@/components/plan/roadmap-client'

type Props = { variant: 'modebar' | 'inline' }

/**
 * "On your roadmap: {next task}, {n} min →" for Study Mode's mode bar and
 * anywhere else a lesson wants one line back to the plan.
 *
 * It fetches only when the auth cookie is present, reads a ten-minute
 * per-date cache first, and renders nothing until it has data — but the
 * mode-bar variant always reserves its height, so the bar never shifts
 * when the chip arrives (or does not). No plan, signed out, any error:
 * nothing, quietly.
 */
export function RoadmapChip({ variant }: Props) {
  const [summary, setSummary] = useState<RoadmapTodaySummary | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    void fetchTodaySummary().then((s) => {
      if (alive) setSummary(s)
    })
    return () => {
      alive = false
    }
  }, [])

  const task = summary?.nextTask ?? null
  const link = task ? (
    <LoadingLink href={task.href ?? '/dashboard/plan'} variant="inline" className="ms-rm-chiplink">
      On your roadmap: {task.label}, {task.minutes} min →
    </LoadingLink>
  ) : null

  if (variant === 'inline') return link
  return (
    <span className="ms-rm-chipwrap" data-state={summary === undefined ? 'loading' : task ? 'ready' : 'empty'}>
      {link}
    </span>
  )
}
