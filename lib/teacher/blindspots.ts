import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'

/**
 * Ranking and confidence for the class blindspot view.
 *
 * A teacher's question is "which topics is my class weak on, and which of those
 * do I actually believe?" — many topics compared at once. The view previously
 * answered only the first half, for only the single worst topic, with the rest
 * reduced to chips.
 *
 * Evidence is kept separate from performance, exactly as on the student mastery
 * heatmap: a topic averaging 38% across 4 of 28 students is not the same fact
 * as 38% across 24 of 28, and collapsing them would send a teacher to reteach
 * something on the strength of four scripts.
 */

export type BlindspotInput = {
  code: string
  name: string
  paper: string
  avgMastery: number
  studentsAttempted: number
  totalStudents: number
}

export type BlindspotLevel = 'critical' | 'proficient' | 'secure'

export type RankedBlindspot = BlindspotInput & {
  level: BlindspotLevel
  /** Share of the class with evidence on this topic, 0–100. */
  coveragePct: number
  /** True when too few students have attempted it to act on confidently. */
  thinEvidence: boolean
}

/** Thresholds mirror lib/mastery so the teacher and student views never
 * disagree about what "critical" means. */
const CRITICAL_THRESHOLD = 40
const PROFICIENT_THRESHOLD = 75

/** Below a quarter of the class, a topic average is a handful of scripts. */
const THIN_COVERAGE_RATIO = 0.25

export function levelFor(avgMastery: number): BlindspotLevel {
  if (avgMastery < CRITICAL_THRESHOLD) return 'critical'
  if (avgMastery < PROFICIENT_THRESHOLD) return 'proficient'
  return 'secure'
}

export function rankBlindspots(
  topics: BlindspotInput[],
  limit = 8
): RankedBlindspot[] {
  return topics
    .filter((t) => t.totalStudents > 0)
    .map((t) => {
      const coveragePct = Math.round(
        (t.studentsAttempted / t.totalStudents) * 100
      )
      const minStudents = Math.max(
        MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY,
        Math.ceil(t.totalStudents * THIN_COVERAGE_RATIO)
      )
      return {
        ...t,
        level: levelFor(t.avgMastery),
        coveragePct,
        thinEvidence: t.studentsAttempted < minStudents,
      }
    })
    // Weakest first — that is the teacher's priority order. Ties break on
    // coverage, so the better-evidenced topic is the one they see first.
    .sort(
      (a, b) =>
        a.avgMastery - b.avgMastery || b.studentsAttempted - a.studentsAttempted
    )
    .slice(0, limit)
}

/** Topics weak enough to act on AND evidenced enough to trust — the set an
 * intervention should target. */
export function actionable(ranked: RankedBlindspot[]): RankedBlindspot[] {
  return ranked.filter((t) => t.level !== 'secure' && !t.thinEvidence)
}
