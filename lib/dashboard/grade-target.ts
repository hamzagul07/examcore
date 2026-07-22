import { GRADE_BOUNDARIES, predictGradeFromPercentage } from '@/lib/grade-boundaries'
import { gapToTargetGrade } from '@/lib/target-grade'

/**
 * "Where am I, where am I aiming, and how long have I got?"
 *
 * The three facts a student in an exam year actually cares about were all in
 * the database and none of them were on the dashboard together: recent average
 * (from attempts), target grade (user_profiles.target_grade, previously only
 * visible in settings), and the exam date. Apart they are trivia; together they
 * are the reason to open the app.
 */

export type GradeTargetBand = {
  grade: string
  /** Lower bound of the band as a percentage. */
  percentage: number
}

export type GradeTarget = {
  /** Mean score across the recent window, 0–100. */
  averagePct: number
  currentGrade: string
  /** Null when the student hasn't set one — the prompt is then the point. */
  targetGrade: string | null
  /** Boundary % for the target. Null for IB numeric grades, which have no
   * Cambridge percentage boundary — showing one would be invented precision. */
  targetPct: number | null
  /** Percentage points still to find. 0 when already at or above target. */
  pointsToGo: number | null
  onTrack: boolean
  daysToExam: number | null
  /** Attempts the average is built from — the honesty caveat for small n. */
  sampleSize: number
  bands: GradeTargetBand[]
}

export type GradeTargetAttempt = {
  marks_earned: number | null
  total_marks: number | null
  created_at: string
}

/** Recent form, not all-time: a student who has improved shouldn't be judged
 * on marks from three months ago. */
export const RECENT_WINDOW = 10

export function buildGradeTarget({
  attempts,
  targetGrade,
  examDate,
  now = new Date(),
}: {
  attempts: GradeTargetAttempt[]
  targetGrade: string | null
  examDate: string | null
  now?: Date
}): GradeTarget | null {
  const scored = attempts
    .filter(
      (a) =>
        typeof a.marks_earned === 'number' &&
        typeof a.total_marks === 'number' &&
        (a.total_marks as number) > 0
    )
    .sort(
      (x, y) =>
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
    )
    .slice(0, RECENT_WINDOW)

  // No marks means no position on the track — and a track with no dot on it
  // says nothing worth the space.
  if (scored.length === 0) return null

  const averagePct =
    scored.reduce(
      (sum, a) =>
        sum + ((a.marks_earned as number) / (a.total_marks as number)) * 100,
      0
    ) / scored.length

  const rounded = Math.round(averagePct)
  const gap = gapToTargetGrade(rounded, targetGrade)
  const targetBoundary = targetGrade
    ? GRADE_BOUNDARIES.find((b) => b.grade === targetGrade)
    : undefined

  let daysToExam: number | null = null
  if (examDate) {
    const exam = new Date(`${examDate}T00:00:00Z`)
    if (!Number.isNaN(exam.getTime())) {
      const ms = exam.getTime() - now.getTime()
      // Past exam dates are stale profile data, not a negative countdown.
      daysToExam = ms > 0 ? Math.ceil(ms / 86_400_000) : null
    }
  }

  return {
    averagePct: rounded,
    currentGrade: predictGradeFromPercentage(rounded).grade,
    targetGrade,
    targetPct: targetBoundary?.percentage ?? null,
    pointsToGo: gap ? gap.pointsToGo : null,
    onTrack: gap ? gap.onTrack : false,
    daysToExam,
    sampleSize: scored.length,
    bands: GRADE_BOUNDARIES.map((b) => ({
      grade: b.grade,
      percentage: b.percentage,
    })),
  }
}
