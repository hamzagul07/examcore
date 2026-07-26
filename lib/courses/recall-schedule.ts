/**
 * Scheduling and filtering for lesson recall.
 *
 * Pure so the interval growth and the suppression rules are testable without a
 * database — the queue itself is hard to exercise, since it needs an
 * authenticated user with attempt history.
 */

export const DAY_MS = 86_400_000

/** First recall lands 3 days out; then 7, 16, 35, capped at 60. */
const INTERVALS = [3, 7, 16, 35, 60] as const

/**
 * Next interval after a student works a lesson again.
 *
 * Expanding rather than fixed: re-answering a lesson you already recalled is
 * evidence it is sticking, so it should come back less often, not on the same
 * drumbeat. A partial pass (some questions left blank) does not earn the full
 * expansion — it repeats the current interval instead.
 */
export function nextRecallInterval(
  currentDays: number,
  answered: number,
  total: number
): number {
  const complete = total > 0 && answered >= total
  if (!complete) return clampToKnown(currentDays)
  const idx = INTERVALS.findIndex((d) => d >= currentDays)
  const next = idx === -1 ? INTERVALS[INTERVALS.length - 1] : INTERVALS[Math.min(idx + 1, INTERVALS.length - 1)]
  return next
}

function clampToKnown(days: number): number {
  if (days <= INTERVALS[0]) return INTERVALS[0]
  const found = INTERVALS.find((d) => d >= days)
  return found ?? INTERVALS[INTERVALS.length - 1]
}

/** The first interval, and therefore what a guest would get if they signed in. */
export const FIRST_INTERVAL_DAYS = INTERVALS[0]

/**
 * The interval in words.
 *
 * Recall is the strongest thing the product does and it happens entirely out of
 * sight — a student finishes a quick check, a row is written, and days later a
 * lesson reappears with no memory of having been promised. Saying it out loud
 * at the moment it is scheduled turns a background job into a commitment.
 *
 * Rounded to how people actually talk about time. "In 16 days" is technically
 * what the schedule says and nobody thinks in 16s.
 */
export function describeInterval(days: number): string {
  if (days <= 1) return 'tomorrow'
  if (days < 7) return `in ${days} days`
  if (days < 11) return 'in a week'
  if (days < 21) return 'in a couple of weeks'
  if (days < 45) return 'in about a month'
  return 'in about two months'
}

export type RecallRow = {
  subject_code: string
  lesson_slug: string
  topic_code: string
  answered_count: number
  total_count: number
  due_at: string
  last_worked_at: string
}

export type RecallCandidate = {
  subjectCode: string
  lessonSlug: string
  topicCode: string
  daysSince: number
  answered: number
  total: number
}

/**
 * Which recalled lessons should surface now.
 *
 * Two suppressions, both deliberate:
 *
 * - Not yet due. Recall works because of the delay; showing a lesson the day
 *   after you did it is just re-reading.
 * - Already marked on that topic. A marked attempt is a strictly stronger
 *   signal than a self-assessed quick check, and the attempt-driven queue
 *   already covers it — surfacing both would show the same topic twice, once
 *   with a real score and once without.
 */
export function selectDueRecall(
  rows: RecallRow[],
  markedTopicKeys: ReadonlySet<string>,
  nowMs: number
): RecallCandidate[] {
  const out: RecallCandidate[] = []
  for (const r of rows) {
    if (!r.lesson_slug || !r.subject_code) continue
    const due = Date.parse(r.due_at)
    if (Number.isNaN(due) || due > nowMs) continue
    if (markedTopicKeys.has(`${r.subject_code}::${r.topic_code}`)) continue
    const last = Date.parse(r.last_worked_at)
    out.push({
      subjectCode: r.subject_code,
      lessonSlug: r.lesson_slug,
      topicCode: r.topic_code,
      daysSince: Number.isNaN(last) ? 999 : Math.floor((nowMs - last) / DAY_MS),
      answered: r.answered_count,
      total: r.total_count,
    })
  }
  // Stalest first — the lesson furthest from memory is the one worth reopening.
  return out.sort((a, b) => b.daysSince - a.daysSince)
}
