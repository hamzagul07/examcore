/**
 * Daily activity for the dashboard momentum strip.
 *
 * The home page is where a study habit either forms or doesn't, and it had no
 * picture of one — streak and weekly totals were rendered as sentences. This
 * turns the attempts the page already loads into a per-day series, so "have I
 * shown up this week?" is answered at a glance instead of read.
 *
 * UTC day boundaries throughout, to stay consistent with `computeStreak` — two
 * different definitions of "today" on the same screen would be worse than none.
 */

export type MomentumDay = {
  /** UTC date key, YYYY-MM-DD. */
  date: string
  /** Marks completed that day. */
  count: number
  /** Mean score that day as a percentage, or null if nothing was marked. */
  avgPct: number | null
  isToday: boolean
}

export type MomentumSummary = {
  days: MomentumDay[]
  /** Highest single-day count in the window — the bar scale's upper bound. */
  peak: number
  /** Days in the window with at least one mark. */
  activeDays: number
  /** Mean score across the window, or null when nothing was marked. */
  avgPct: number | null
  /**
   * Change in mean score against the preceding window of equal length.
   * Null when either side has no marks, so we never imply a trend from one
   * data point.
   */
  deltaPct: number | null
}

export type MomentumAttempt = {
  created_at: string
  marks_earned: number | null
  total_marks: number | null
}

function utcKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function scorePct(a: MomentumAttempt): number | null {
  if (typeof a.marks_earned !== 'number' || typeof a.total_marks !== 'number') {
    return null
  }
  if (a.total_marks <= 0) return null
  return (a.marks_earned / a.total_marks) * 100
}

function meanPct(attempts: MomentumAttempt[]): number | null {
  const pcts = attempts.map(scorePct).filter((p): p is number => p != null)
  if (pcts.length === 0) return null
  return pcts.reduce((sum, p) => sum + p, 0) / pcts.length
}

/**
 * Build the last `windowDays` of activity, oldest first, including empty days —
 * the gaps are the point. `now` is injectable so this stays deterministic.
 */
export function buildMomentum(
  attempts: MomentumAttempt[],
  windowDays = 14,
  now: Date = new Date()
): MomentumSummary {
  const todayKey = utcKey(now)

  const keys: string[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    keys.push(utcKey(d))
  }
  const windowStartKey = keys[0]

  // Preceding window of equal length, for the delta.
  const prevStart = new Date(now)
  prevStart.setUTCDate(prevStart.getUTCDate() - windowDays * 2 + 1)
  const prevStartKey = utcKey(prevStart)

  const byDay = new Map<string, MomentumAttempt[]>()
  const current: MomentumAttempt[] = []
  const previous: MomentumAttempt[] = []

  for (const a of attempts) {
    const parsed = new Date(a.created_at)
    if (Number.isNaN(parsed.getTime())) continue
    const key = utcKey(parsed)
    if (key >= windowStartKey && key <= todayKey) {
      current.push(a)
      const list = byDay.get(key)
      if (list) list.push(a)
      else byDay.set(key, [a])
    } else if (key >= prevStartKey && key < windowStartKey) {
      previous.push(a)
    }
  }

  const days: MomentumDay[] = keys.map((date) => {
    const dayAttempts = byDay.get(date) ?? []
    return {
      date,
      count: dayAttempts.length,
      avgPct: meanPct(dayAttempts),
      isToday: date === todayKey,
    }
  })

  const avgPct = meanPct(current)
  const prevAvg = meanPct(previous)

  return {
    days,
    peak: days.reduce((max, d) => Math.max(max, d.count), 0),
    activeDays: days.filter((d) => d.count > 0).length,
    avgPct: avgPct == null ? null : Math.round(avgPct),
    deltaPct:
      avgPct == null || prevAvg == null ? null : Math.round(avgPct - prevAvg),
  }
}

/** Short weekday initial for the axis (UTC, locale-independent). */
export function weekdayInitial(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`)
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getUTCDay()] ?? ''
}
