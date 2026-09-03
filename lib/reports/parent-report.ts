/**
 * The one page a student sends to a parent.
 *
 * CONVERSION_PSYCHOLOGY.md §8 concluded the buyer is usually not the user: a
 * 16-year-old rarely completes a card payment alone, and the funnel has no
 * parent in it anywhere. §12 item 7 has been the last unchecked item in that
 * document's own build order since July, and the pricing FAQ already tells
 * students to "hand them this page" — a page that did not exist.
 *
 * What a parent wants is not a score. It is EVIDENCE OF EFFORT, and then a
 * reason to believe the effort is aimed at something. So the report leads with
 * how much work has been done and how consistently, and only then shows where
 * it is going: target grade, the gap to it, and the three topics that would
 * close the gap fastest.
 *
 * Deliberately absent, because a share link is a bearer credential that will
 * end up in a family WhatsApp group:
 *   - the student's name, email, or any account identifier
 *   - anything they wrote, and any examiner comment on it
 *   - individual scores; a bad afternoon is not the parent's business, and a
 *     report that can embarrass its subject does not get shared
 *
 * Pure. The route feeds it rows and a profile; every figure here is derived,
 * so the whole thing is testable without a database.
 *
 * The weakest-topic ranking mirrors the one in weekly-report.ts. Left
 * duplicated on purpose: that file has no test, it runs a live Sunday email
 * batch, and the two reports answer different questions over different windows
 * — "your week" against "the year so far". A shared helper can be lifted out
 * later behind a test, and would be a poor trade today.
 */
import { calculateMastery, type AttemptLite, type LeafMastery } from '@/lib/mastery'
import { predictGrade } from '@/lib/prediction'
import { topicTargetsFromMasteries } from '@/lib/insights/recommendations'
import { gapToTargetGrade } from '@/lib/target-grade'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { getSubjectByCode } from '@/lib/profile-options'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getSyllabusByCode, getSyllabusSubjectName } from '@/lib/syllabi'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

/** The recent window every "lately" figure is measured over. */
export const RECENT_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_MS = RECENT_WINDOW_DAYS * DAY_MS

/** Below this the average is noise, and a parent would read it as a verdict. */
export const MIN_ATTEMPTS_FOR_AVERAGE = 3

export type ParentReportSubject = {
  code: string
  label: string
  /** Questions marked in this subject, all time. */
  marks: number
  /** Null until MIN_ATTEMPTS_FOR_AVERAGE questions carry a total. */
  averagePercentage: number | null
}

export type ParentReportTopic = {
  name: string
  subjectLabel: string | null
  percentage: number
}

export type ParentProgressReport = {
  /** All time. The effort number, and the reason the page exists. */
  marksCompleted: number
  marksRecent: number
  /**
   * Distinct days with at least one mark in the window.
   *
   * Consistency, not volume — twelve questions across nine evenings is the
   * thing a parent is actually hoping to see, and it is invisible in a count.
   */
  activeDaysRecent: number
  /** ISO timestamps, so the page can say how long this has been going on. */
  firstMarkedAt: string | null
  lastMarkedAt: string | null
  /**
   * True when the caller could only hand over a window of the history.
   *
   * `marksCompleted` is an exact all-time count, but everything derived —
   * subjects, averages, weak topics — is computed from the rows actually
   * supplied. Past the caller's page size those disagree, and a report that
   * says "800 questions" beside a subject list covering the last 500 is
   * quietly wrong in the direction that flatters us. The page states the
   * window instead of hiding it.
   */
  detailIsWindowed: boolean
  /** How many rows the breakdown was computed from, when windowed. */
  detailWindowSize: number | null
  subjects: ParentReportSubject[]
  averagePercentage: number | null
  /** Percentage points against the preceding window; null without both. */
  averageDelta: number | null
  primarySubjectLabel: string | null
  /** Cambridge letter estimate. Null for IB, which is not on these boundaries. */
  predictedGrade: string | null
  targetGrade: string | null
  pointsToTarget: number | null
  onTrackForTarget: boolean
  /** Up to three, weakest first — the "what to do next" list. */
  weakTopics: ParentReportTopic[]
  examDaysLeft: number | null
  /**
   * False when there is too little work to say anything honest. The page shows
   * the effort figures and stops rather than inventing a trajectory from n=1.
   */
  hasEnoughForTrajectory: boolean
}

export type ParentReportProfile = {
  target_grade: string | null
  exam_date: string | null
}

function subjectLabel(code: string): string | null {
  return getSubjectByCode(code)?.label ?? getSyllabusSubjectName(code) ?? null
}

/** Marks-weighted, so a 1-mark question cannot swing the figure like a 20. */
function weightedAverage(rows: AttemptLite[]): number | null {
  const scored = rows.filter((a) => Number(a.total_marks) > 0)
  if (scored.length < MIN_ATTEMPTS_FOR_AVERAGE) return null
  const earned = scored.reduce((s, a) => s + (Number(a.marks_earned) || 0), 0)
  const available = scored.reduce((s, a) => s + Number(a.total_marks), 0)
  if (available <= 0) return null
  return (earned / available) * 100
}

function msOf(a: AttemptLite): number {
  const t = new Date(a.created_at).getTime()
  return Number.isFinite(t) ? t : Number.NaN
}

export function buildParentReport(
  attempts: AttemptWithPaper[],
  profile: ParentReportProfile,
  opts?: {
    asOf?: Date
    /**
     * The true all-time count, when the caller's query was capped.
     *
     * `attempts.length` is only the count when every row was fetched. The
     * report's headline figure is the number a parent is being shown, so a
     * capped query silently telling a hard-working student they have done 200
     * questions is the one number here that must not be wrong.
     */
    totalMarksCompleted?: number
    /**
     * The true earliest mark, when the caller's query was capped.
     *
     * Without it "since March" is read off the oldest row that happened to fit
     * in the page, which for a busy student is a date months after they
     * actually started — the one figure on this page a parent is most likely
     * to check against their own memory.
     */
    firstMarkedAt?: string | null
  }
): ParentProgressReport {
  const lite = attempts as unknown as AttemptLite[]
  const now = (opts?.asOf ?? new Date()).getTime()
  const dated = lite.filter((a) => Number.isFinite(msOf(a)))

  const recent = dated.filter((a) => msOf(a) >= now - RECENT_MS)
  const prior = dated.filter(
    (a) => msOf(a) >= now - 2 * RECENT_MS && msOf(a) < now - RECENT_MS
  )

  // Local calendar days, so "nine evenings" is nine, not eight-and-a-bit.
  const days = new Set(recent.map((a) => new Date(msOf(a)).toDateString()))

  const times = dated.map(msOf).sort((x, y) => x - y)
  const firstMarkedAt =
    opts?.firstMarkedAt ?? (times.length ? new Date(times[0]).toISOString() : null)
  const lastMarkedAt = times.length
    ? new Date(times[times.length - 1]).toISOString()
    : null

  // ── Per subject ───────────────────────────────────────────────────────────
  const bySubject = new Map<string, AttemptLite[]>()
  for (const a of attempts) {
    const code = getAttemptSubjectCode(a)
    if (!code) continue
    const bucket = bySubject.get(code)
    if (bucket) bucket.push(a as unknown as AttemptLite)
    else bySubject.set(code, [a as unknown as AttemptLite])
  }

  const subjects: ParentReportSubject[] = [...bySubject.entries()]
    .map(([code, rows]) => ({
      code,
      label: subjectLabel(code) ?? code,
      marks: rows.length,
      averagePercentage: roundOrNull(weightedAverage(rows)),
    }))
    .sort((a, b) => b.marks - a.marks || a.label.localeCompare(b.label))

  const primary = subjects[0]?.code ?? null

  // ── Trajectory, for the primary subject only ──────────────────────────────
  // One subject's worth of grade talk is enough for one page, and the primary
  // is where the work actually is.
  let predictedGrade: string | null = null
  let pointsToTarget: number | null = null
  let onTrackForTarget = false
  if (primary && getSyllabusByCode(primary)?.length) {
    const rows = bySubject.get(primary) ?? []
    const masteries = calculateMastery(rows, primary)
    const prediction = predictGrade(rows, masteries)
    if (!isIbSubjectCode(primary) && prediction.predictedGrade !== '—') {
      predictedGrade = prediction.predictedGrade
      const gap = gapToTargetGrade(prediction.averagePercentage, profile.target_grade)
      if (gap) {
        onTrackForTarget = gap.onTrack
        pointsToTarget = gap.onTrack ? 0 : gap.pointsToGo
      }
    }
  }

  // ── Weakest topics, across every subject with a syllabus tree ─────────────
  const ranked: Array<{ subject: string; name: string; percentage: number }> = []
  for (const [code, rows] of bySubject) {
    if (!getSyllabusByCode(code)?.length) continue
    const leaves: LeafMastery[] = calculateMastery(rows, code)
    const pctByCode = new Map(leaves.map((l) => [l.code, l.percentage]))
    for (const t of topicTargetsFromMasteries(leaves)) {
      ranked.push({
        subject: code,
        name: t.name,
        percentage: pctByCode.get(t.code) ?? 100,
      })
    }
  }
  ranked.sort((a, b) => a.percentage - b.percentage)

  // The exact count wins when the caller supplied one, and can only ever be
  // larger than what we hold — a smaller value would mean a stale count
  // subtracting from work we can see.
  const totalMarksCompleted =
    typeof opts?.totalMarksCompleted === 'number' &&
    opts.totalMarksCompleted >= attempts.length
      ? opts.totalMarksCompleted
      : attempts.length

  const avgRecent = weightedAverage(recent)
  const avgPrior = weightedAverage(prior)
  const countdown = examCountdown(profile.exam_date)

  return {
    marksCompleted: totalMarksCompleted,
    detailIsWindowed: totalMarksCompleted > attempts.length,
    detailWindowSize: totalMarksCompleted > attempts.length ? attempts.length : null,
    marksRecent: recent.length,
    activeDaysRecent: days.size,
    firstMarkedAt,
    lastMarkedAt,
    subjects,
    averagePercentage: roundOrNull(avgRecent ?? weightedAverage(lite)),
    averageDelta:
      avgRecent !== null && avgPrior !== null
        ? Math.round(avgRecent - avgPrior)
        : null,
    primarySubjectLabel: primary ? subjectLabel(primary) : null,
    predictedGrade,
    targetGrade: profile.target_grade,
    pointsToTarget,
    onTrackForTarget,
    weakTopics: ranked.slice(0, 3).map((r) => ({
      name: r.name,
      subjectLabel: subjectLabel(r.subject),
      percentage: Math.round(r.percentage),
    })),
    examDaysLeft: countdown.kind === 'future' ? countdown.daysLeft : null,
    hasEnoughForTrajectory: attempts.length >= MIN_ATTEMPTS_FOR_AVERAGE,

  }
}

function roundOrNull(n: number | null): number | null {
  return n === null ? null : Math.round(n)
}
