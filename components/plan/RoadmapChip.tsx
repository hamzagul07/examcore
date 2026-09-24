'use client'

import { useEffect, useState } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { TASK_TYPE_LABEL, type RoadmapTodaySummary } from '@/lib/plan/roadmap-types'
import { fetchTodaySummary } from '@/components/plan/roadmap-client'

type Props = { variant: 'modebar' | 'inline' }

type NextTask = NonNullable<RoadmapTodaySummary['nextTask']>

/**
 * "Roadmap · Quick diagnostic · Equations of motion · 10 min →": the task's
 * type, topic and length, which fits a mode bar. The full objective rides
 * on the link's title and aria-label. A summary written before the type and
 * topic were on it falls back to the old sentence.
 */
export function chipLabel(task: NextTask): string {
  if (!task.taskType) return `On your roadmap: ${task.label}, ${task.minutes} min →`
  return `Roadmap · ${TASK_TYPE_LABEL[task.taskType]}${task.topic ? ` · ${task.topic}` : ''} · ${task.minutes} min →`
}

/**
 * One line back to the plan for Study Mode's mode bar and anywhere else a
 * lesson wants it.
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
    <LoadingLink href={task.href ?? '/dashboard/plan'} variant="inline" className="ms-rm-chiplink" title={task.objective} aria-label={`${task.objective} — on your roadmap, ${task.minutes} minutes`}>
      {chipLabel(task)}
    </LoadingLink>
  ) : null

  if (variant === 'inline') return link
  return (
    <span className="ms-rm-chipwrap" data-state={summary === undefined ? 'loading' : task ? 'ready' : 'empty'}>
      {link}
    </span>
  )
}
