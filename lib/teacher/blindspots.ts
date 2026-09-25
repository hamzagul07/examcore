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
 *
 * This module is the ONE place the teacher system decides how weak "weak" is.
 * `levelFor` is used by the blindspot list, class mastery, the week view's
 * "struggling" list and the review queue's low-score reason; nothing else in
 * lib/teacher* may compare a percentage against its own number. (The analytics
 * rewrite removed a second, stricter `< 50` cut-off that had drifted away from
 * these bands.)
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

/**
 * Band edges, in percent. They mirror lib/mastery (which keeps its own copy
 * private) so the teacher and student views never disagree about what
 * "critical" means; blindspots.test.ts checks the two against each other.
 */
export const CRITICAL_BELOW_PCT = 40
export const SECURE_FROM_PCT = 75

/** Below a quarter of the class, a topic average is a handful of scripts. */
const THIN_COVERAGE_RATIO = 0.25

export function levelFor(avgMastery: number): BlindspotLevel {
  if (avgMastery < CRITICAL_BELOW_PCT) return 'critical'
  if (avgMastery < SECURE_FROM_PCT) return 'proficient'
  return 'secure'
}

/**
 * Whether a class topic average is a blindspot: weak (not `secure`) and
 * resting on at least as many marked attempts as a student's own mastery
 * needs before it stops being "sampled".
 */
export function isBlindspot(topic: { avgMastery: number | null; classAttempts: number }): boolean {
  if (topic.avgMastery === null || !Number.isFinite(topic.avgMastery)) return false
  if (topic.classAttempts < MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY) return false
  return levelFor(topic.avgMastery) !== 'secure'
}

/**
 * Topic analytics → the rows the blindspot chart takes. The roster size is
 * supplied by the caller because topic analytics only knows who attempted a
 * topic, not who is in the class. Topics with no average are dropped: there is
 * nothing to draw.
 */
export function toBlindspotInputs(
  topics: ReadonlyArray<{
    code: string
    name: string
    paper: string
    avgMastery: number | null
    studentsAttempted: number
  }>,
  totalStudents: number
): BlindspotInput[] {
  const roster = Number.isFinite(totalStudents) && totalStudents > 0 ? Math.floor(totalStudents) : 0
  const out: BlindspotInput[] = []
  for (const t of topics) {
    if (t.avgMastery === null || !Number.isFinite(t.avgMastery)) continue
    out.push({
      code: t.code,
      name: t.name,
      paper: t.paper,
      avgMastery: t.avgMastery,
      // A student who has since left can still be among the attempters of an
      // older topic in a loosely scoped read; never report more than 100%.
      studentsAttempted: Math.min(t.studentsAttempted, roster),
      totalStudents: roster,
    })
  }
  return out
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
