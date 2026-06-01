/**
 * Journey timeline model — the metro-map of a student's progress. Each station
 * is a real marked attempt; a handful are promoted to "major" stops (first
 * mark, personal best, perfect scores, latest) so the Story view reads as a
 * narrative rather than a wall of dots. Nothing here is synthetic.
 */

import type { AttemptLite } from '@/lib/mastery'
import type { TimelineStation } from './types'

/** Most recent attempts to plot; keeps the metro line legible. */
const WINDOW = 24

function pct(a: AttemptLite): number {
  return a.total_marks > 0 ? (a.marks_earned / a.total_marks) * 100 : 0
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildTimeline(attempts: AttemptLite[]): TimelineStation[] {
  if (attempts.length === 0) return []

  const globalFirst = attempts[attempts.length - 1]
  const window = attempts.slice(0, WINDOW)
  const oldestFirst = [...window].reverse()

  // Index of the highest-scoring attempt within the window.
  let bestIdx = 0
  for (let i = 1; i < oldestFirst.length; i++) {
    if (pct(oldestFirst[i]) > pct(oldestFirst[bestIdx])) bestIdx = i
  }
  const lastIdx = oldestFirst.length - 1
  const firstAttemptId = globalFirst.id

  const stations: TimelineStation[] = oldestFirst.map((a, i) => {
    const score = Math.round(pct(a))
    const isFirst = a.id === firstAttemptId
    const isLast = i === lastIdx
    const isBest = i === bestIdx && oldestFirst.length > 1
    const isPerfect = score >= 100

    let kind: TimelineStation['kind'] = 'attempt'
    let label = shortDate(a.created_at)
    let major = false

    if (isFirst) {
      kind = 'first_mark'
      label = 'First mark'
      major = true
    } else if (isLast) {
      kind = 'latest'
      label = 'Most recent'
      major = true
    } else if (isPerfect) {
      kind = 'milestone'
      label = 'Full marks'
      major = true
    } else if (isBest) {
      kind = 'best'
      label = 'Personal best'
      major = true
    }

    return {
      id: a.id,
      kind,
      date: a.created_at,
      label,
      detail: `${a.marks_earned}/${a.total_marks} · ${score}%`,
      score,
      major,
    }
  })

  // If the global first attempt fell outside the window, prepend a start stop.
  if (globalFirst.id !== oldestFirst[0]?.id) {
    stations.unshift({
      id: `start-${globalFirst.id}`,
      kind: 'first_mark',
      date: globalFirst.created_at,
      label: 'First mark',
      detail: shortDate(globalFirst.created_at),
      score: Math.round(pct(globalFirst)),
      major: true,
    })
  }

  return stations
}
