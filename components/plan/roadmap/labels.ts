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
import type { HistoryTally, RoadmapTask, TaskStanding } from '@/lib/plan/roadmap-view'
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

/**
 * The same task on a day that has passed. "Let go for now" promises a
 * return that a past day cannot keep, and a task the rollover dropped was
 * never the student's choice, so on the history view anything that did
 * not happen is "Not done" — done, skipped and moved keep their words.
 */
export function historyLabel(standing: TaskStanding, entry?: TaskStateEntry): string {
  switch (standing) {
    case 'done':
      return 'Done'
    case 'skipped':
      return 'Skipped'
    case 'deferred':
      return standingLabel(standing, entry) ?? 'Moved to another day'
    default:
      return 'Not done'
  }
}

/** "3 of 5 done · 1 moved" for a past day's header. A count of facts, never a percentage. */
export function historyTallyLine(t: HistoryTally): string {
  if (t.total === 0) return ''
  const parts = [`${t.done} of ${t.total} done`]
  if (t.moved > 0) parts.push(`${t.moved} moved`)
  if (t.skipped > 0) parts.push(`${t.skipped} skipped`)
  return parts.join(' · ')
}

/** "Today", "Tomorrow" or the date, for a carry-over option and a day heading. */
export function dayLabel(date: string, todayIso: string): string {
  if (date === todayIso) return 'Today'
  const next = new Date(`${todayIso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  if (next.toISOString().slice(0, 10) === date) return 'Tomorrow'
  return formatPlanDate(date)
}

/** The one line a carry-over option shows under its day. */
export function carryFitLine(o: { minutes: number; fit: 'full' | 'shortened' | 'over'; over?: number; inHand: number }): string {
  if (o.fit === 'full') return o.inHand > 0 ? `${o.minutes} min · about ${o.inHand} min in hand there` : `${o.minutes} min · fits`
  if (o.fit === 'shortened') return `Shortened to ${o.minutes} min — the room that day has`
  return `${o.minutes} min, running ${o.over ?? 0} min past that day's last window`
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
