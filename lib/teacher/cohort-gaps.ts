/**
 * Cohort gap report — where a whole class loses marks, by mark type.
 *
 * The existing blindspot view answers "which topics is my class weak on".
 * This answers a different question, and the one a head of department can act on
 * in a single lesson: *what kind of mark* is being dropped. A class averaging
 * 55% because it earns 84% of Method marks and 9% of Analysis marks has a
 * teachable problem — it cannot analyse — and that is invisible in a topic
 * average, which shows only that several topics are middling.
 *
 * The evidence comes from `attempts.ai_marking.marks_awarded[]`, one record per
 * mark-scheme point, each carrying the point's code (`M1`, `An2`, `Ev4`), whether
 * it was earned, and the marker's note when it was not.
 */

/** One mark-scheme point as recorded by the marker. */
export type MarkPoint = {
  type?: string | null
  earned?: boolean | null
  margin_note?: string | null
  error_classification?: string | null
}

export type GapAttempt = {
  user_id: string
  marks_earned: number | null
  total_marks: number | null
  ai_marking?: {
    marks_awarded?: MarkPoint[] | null
    /** 'point_based' | 'level_of_response' | absent on older rows. */
    marking_style?: string | null
  } | null
}

export type MarkTypeGap = {
  /** Normalised code prefix, e.g. `AN`. */
  code: string
  /** Human label, or the bare code when the vocabulary is unrecognised. */
  label: string
  points: number
  earned: number
  /** Share of available points earned, 0–100. */
  earnedPct: number
  /** Too few points marked to draw a conclusion from. */
  thinEvidence: boolean
}

export type MissedPoint = {
  note: string
  /** How many times this note appeared on an unearned point. */
  occurrences: number
  /** How many distinct students dropped it. */
  students: number
}

export type CohortGapReport = {
  scripts: number
  students: number
  marksEarned: number
  marksAvailable: number
  /** Class average as a percentage, 0–100. */
  averagePct: number
  /** Worst-performing mark type first — the teaching priority order. */
  markTypes: MarkTypeGap[]
  /** The specific things most students failed to do. */
  mostMissed: MissedPoint[]
  /** Why marks were dropped, by the marker's own classification. */
  errorBreakdown: { classification: string; count: number }[]
  /** True when there is too little marked work to report on at all. */
  insufficientEvidence: boolean
  /**
   * Banded scripts excluded from the mark-type table.
   *
   * A level-of-response essay is marked against a handful of band descriptors,
   * not against one point per mark: in the live corpus, 19 such scripts carry
   * 331 marks between just 53 descriptors. Counting those descriptors alongside
   * method and accuracy marks would put two different units in one table and
   * make every percentage in it wrong. They still count toward the class
   * average, which is measured in marks.
   */
  bandedScriptsExcluded: number
}

/**
 * Mark-code vocabulary. Cambridge maths papers use M/A/B; essay subjects use
 * K/An/Ev/B; others bring their own. Unknown codes are surfaced under their own
 * code rather than being dropped or lumped into "other" — a teacher seeing an
 * unfamiliar row can tell it is real, and it keeps the totals honest.
 */
const MARK_TYPE_LABELS: Record<string, string> = {
  M: 'Method',
  DM: 'Dependent method',
  A: 'Accuracy',
  B: 'Independent (B) marks',
  K: 'Knowledge',
  AN: 'Analysis',
  EV: 'Evaluation',
  AP: 'Application',
  C: 'Communication',
  R: 'Reasoning',
  E: 'Explanation',
  AG: 'Answer given (show that)',
  AO: 'Assessment objective',
  SC: 'Special case',
  FT: 'Follow through',
}

/**
 * Different papers spell the same mark type differently — `App3` and `Ap3` are
 * both application marks. Folding them here rather than at display time keeps
 * one row per real mark type; mapping two codes to one label instead produced
 * two identical "Application" rows that split the evidence between them.
 */
const CODE_ALIASES: Record<string, string> = {
  APP: 'AP',
  ANA: 'AN',
  EVAL: 'EV',
  KN: 'K',
  METH: 'M',
  ACC: 'A',
}

/** Below this many marked points, a percentage is noise. */
const MIN_POINTS_PER_TYPE = 5
/**
 * Marking styles whose per-point array is band descriptors rather than one
 * entry per mark. Their points are not comparable with M/A/B marks.
 */
const BANDED_STYLES = new Set(['level_of_response'])
/** Below this many marked scripts, the report says so instead of reporting. */
const MIN_SCRIPTS = 3

/** `An2` → `AN`, `App1` → `AP`. Returns null for codes that carry no letters. */
export function markTypeCode(rawType: string | null | undefined): string | null {
  if (!rawType) return null
  const letters = rawType.trim().replace(/[^A-Za-z]/g, '')
  if (!letters) return null
  const upper = letters.toUpperCase()
  return CODE_ALIASES[upper] ?? upper
}

export function markTypeLabel(code: string): string {
  return MARK_TYPE_LABELS[code] ?? code
}

/**
 * Folds a marker note into a comparison key. Notes are generated per script, so
 * two students who made the same omission get near-identical sentences; matching
 * on the normalised form groups them without pretending to do fuzzy clustering.
 */
function noteKey(note: string): string {
  return note.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '')
}

export function buildCohortGapReport(
  attempts: GapAttempt[],
  opts: { topMarkTypes?: number; topMissed?: number } = {}
): CohortGapReport {
  const topMarkTypes = opts.topMarkTypes ?? 12
  const topMissed = opts.topMissed ?? 8

  const students = new Set<string>()
  let marksEarned = 0
  let marksAvailable = 0

  const byType = new Map<string, { points: number; earned: number }>()
  let bandedScriptsExcluded = 0
  const missed = new Map<string, { note: string; occurrences: number; students: Set<string> }>()
  const errors = new Map<string, number>()

  let scripts = 0

  for (const attempt of attempts) {
    const points = attempt.ai_marking?.marks_awarded
    if (!Array.isArray(points) || points.length === 0) continue

    scripts += 1
    students.add(attempt.user_id)
    marksEarned += attempt.marks_earned ?? 0
    marksAvailable += attempt.total_marks ?? 0

    // Banded scripts contribute to the class average (measured in marks) but
    // not to the mark-type table (measured in mark points).
    const banded = BANDED_STYLES.has(attempt.ai_marking?.marking_style ?? '')
    if (banded) bandedScriptsExcluded += 1

    for (const point of points) {
      const code = markTypeCode(point.type)
      // `earned` is the marker's own boolean; anything non-true is a dropped
      // mark. Treating null as "not earned" matches how the score was computed.
      const earned = point.earned === true

      if (code && !banded) {
        const row = byType.get(code) ?? { points: 0, earned: 0 }
        row.points += 1
        if (earned) row.earned += 1
        byType.set(code, row)
      }

      if (earned) continue

      const note = point.margin_note?.trim()
      if (note) {
        const key = noteKey(note)
        const entry = missed.get(key) ?? { note, occurrences: 0, students: new Set<string>() }
        entry.occurrences += 1
        entry.students.add(attempt.user_id)
        missed.set(key, entry)
      }

      // 'no_error'/'none' describe an earned point; on a dropped mark they carry
      // no information about why it was dropped, so they are not counted.
      const classification = point.error_classification?.trim()
      if (classification && classification !== 'no_error' && classification !== 'none') {
        errors.set(classification, (errors.get(classification) ?? 0) + 1)
      }
    }
  }

  const markTypes: MarkTypeGap[] = [...byType.entries()]
    .map(([code, row]) => ({
      code,
      label: markTypeLabel(code),
      points: row.points,
      earned: row.earned,
      earnedPct: row.points ? Math.round((row.earned / row.points) * 100) : 0,
      thinEvidence: row.points < MIN_POINTS_PER_TYPE,
    }))
    // Weakest first — that is the order a teacher plans lessons in. Ties break
    // on volume so the better-evidenced row leads.
    .sort((a, b) => a.earnedPct - b.earnedPct || b.points - a.points)
    .slice(0, topMarkTypes)

  const mostMissed: MissedPoint[] = [...missed.values()]
    .map((m) => ({ note: m.note, occurrences: m.occurrences, students: m.students.size }))
    .sort(
      (a, b) =>
        b.students - a.students ||
        b.occurrences - a.occurrences ||
        a.note.localeCompare(b.note)
    )
    .slice(0, topMissed)

  const errorBreakdown = [...errors.entries()]
    .map(([classification, count]) => ({ classification, count }))
    .sort((a, b) => b.count - a.count || a.classification.localeCompare(b.classification))

  return {
    scripts,
    students: students.size,
    marksEarned,
    marksAvailable,
    bandedScriptsExcluded,
    averagePct: marksAvailable ? Math.round((marksEarned / marksAvailable) * 100) : 0,
    markTypes,
    mostMissed,
    errorBreakdown,
    insufficientEvidence: scripts < MIN_SCRIPTS,
  }
}

/**
 * The one line to lead a report with. Returns null when the evidence is too thin
 * to name a weakness — saying nothing is better than sending a teacher to
 * reteach analysis on the strength of three marks.
 */
export function headlineGap(report: CohortGapReport): MarkTypeGap | null {
  if (report.insufficientEvidence) return null
  const solid = report.markTypes.filter((t) => !t.thinEvidence)
  if (!solid.length) return null
  const worst = solid[0]
  // A class earning most of a mark type is not failing at it.
  return worst.earnedPct < 60 ? worst : null
}
