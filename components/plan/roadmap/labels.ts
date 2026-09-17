/**
 * The short labels the roadmap's cards and sheets share: what a task's
 * standing is called, where its link goes, how long a shorten makes it.
 * Pure, so the copy is testable and the card and the sheet cannot disagree.
 *
 * Standing labels are deliberately flat. A skipped task is "Skipped", a
 * deferred one names the day it moved to; none of them is a verdict, and
 * none is red (the CSS gives only 'done' a colour).
 */

import { formatPlanDate } from '@/lib/plan/plan-view'
import { MIN_TASK_MINUTES } from '@/lib/plan/modes'
import type { RoadmapTask, TaskStanding } from '@/lib/plan/roadmap-view'
import type { EvidenceSource, TaskStateEntry, TaskType } from '@/lib/plan/roadmap-types'

export function standingLabel(standing: TaskStanding, entry?: TaskStateEntry): string | null {
  switch (standing) {
    case 'done':
      return 'Done'
    case 'skipped':
      return 'Skipped'
    case 'deferred':
      return entry?.deferredTo ? `Moved to ${formatPlanDate(entry.deferredTo)}` : 'Moved to another day'
    case 'dropped':
      return 'Let go for now'
    case 'started':
      return 'In progress'
    default:
      return null
  }
}

/** What opening the task does, from its href alone; the label never guesses at content. */
export function destinationLabel(task: Pick<RoadmapTask, 'href' | 'resourceLabel' | 'kind'>): string {
  const href = task.href ?? ''
  if (!href) return 'Nothing to open for this one'
  if (task.resourceLabel) return `Opens ${task.resourceLabel}`
  if (href.startsWith('/dashboard/review')) return 'Opens your review queue'
  if (href.includes('/courses/')) return 'Opens the lesson'
  if (task.kind === 'timed_paper') return 'Opens the paper'
  if (href.startsWith('/mark')) return 'Opens the marking desk'
  return 'Opens the task'
}

/** Halve a task, never below its type's floor; null when it is already at the floor. */
export function shortenedMinutes(taskType: TaskType, minutes: number): number | null {
  const floor = MIN_TASK_MINUTES[taskType] ?? 10
  const half = Math.floor(minutes / 2 / 5) * 5
  const next = Math.max(floor, half)
  return next < minutes ? next : null
}

export const EVIDENCE_SOURCE_LABEL: Record<EvidenceSource, string> = {
  syllabus: 'From the syllabus',
  user_performance: 'From your marked work',
  diagnostic: 'From your diagnostic',
  indexed_papers: 'From the papers MarkScheme has indexed',
  self_report: 'From what you told us',
  plan: 'From your plan',
}

/** "16:00–16:25" for the timeline gutter; empty when the plan has no window data. */
export function timeSpan(task: Pick<RoadmapTask, 'startsAt' | 'endsAt'>): string {
  if (!task.startsAt) return ''
  return task.endsAt ? `${task.startsAt}–${task.endsAt}` : task.startsAt
}
