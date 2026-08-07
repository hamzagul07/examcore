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
  errorBreakdown: { classification: string; label: string; count: number }[]
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

/**
 * Classifications that describe the *marking*, not the student.
 *
 * `marker_error`, `under_marked` and friends are the marker correcting itself
 * during the second pass. They are real and worth keeping in the data, but a
 * panel headed "why marks were dropped", shown to a teacher deciding whether to
 * trust this tool, is the worst possible place for them: they say nothing about
 * the student and everything about us.
 */
const MARKING_PROCESS_CLASSIFICATIONS = new Set([
  'no_error',
  'none',
  'marker_error',
  'under_marking',
  'under_marked',
  'over_marking',
  'over_marked',
  'misclassification',
  'corrected_error',
  'overturned_first_marker_error',
  // Restates that the mark was not earned, which the reader already knows.
  'mark_not_earned',
])

/** Teacher-facing wording for the classifications that survive. */
const CLASSIFICATION_LABELS: Record<string, string> = {
  incomplete: 'Answer incomplete',
  conceptual: 'Concept misunderstood',
  arithmetic: 'Arithmetic slip',
  calculation_error: 'Calculation error',
  algebraic_sign: 'Sign error',
  missing_step: 'Working step missing',
  insufficient_justification: 'Not justified',
  notation: 'Notation',
  units: 'Units',
  rounding: 'Rounding',
  transcription: 'Copied down wrongly',
}

/** Falls back to de-snaking an unknown code rather than hiding it. */
export function classificationLabel(code: string): string {
  return (
    CLASSIFICATION_LABELS[code] ??
    code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  )
}
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
 * Folds a marker note into a comparison key.
 *
 * Notes are written per script, so two students who made the same omission get
 * sentences that differ in incidental ways. Exact matching on the raw string —
 * the first approach — split one miss across five rows in the live corpus:
 *
 *   3  No final answer
 *   2  No final answer for $a$ given
 *   2  No final answer for a
 *   2  No final answer for a given
 *
 * A teacher reading that sees five small problems instead of one large one,
 * which is the opposite of what the report is for. Maths delimiters are stripped
 * (keeping their contents, so `$a$` and `a` agree) along with punctuation and
 * possessives.
 */
function noteKey(note: string): string {
  return note
    .toLowerCase()
    // Keep the contents of maths spans, drop the delimiters: `for $a$ given`
    // and `for a given` are the same instruction to a student.
    .replace(/\\[()[\]]/g, ' ')
    .replace(/\$+/g, ' ')
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tokens that must match exactly before two notes can be treated as one.
 *
 * "Diagram for the first policy is missing" and "Diagram for the second policy
 * is missing" are ~75% identical by word overlap but are different marks on
 * different parts of the answer. Merging them would tell a teacher one diagram
 * was missed when two were.
 */
const DISCRIMINATORS = new Set([
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'i', 'ii', 'iii', 'iv', 'v', 'vi',
  'a', 'b', 'c', 'd',
])

/**
 * Words that carry no meaning for matching. Deliberately tiny, and deliberately
 * excludes negations ("no", "not") — which flip a note's meaning — and anything
 * in DISCRIMINATORS, since `a` is both an article and a part label.
 */
const STOPWORDS = new Set(['is', 'was', 'are', 'were', 'the', 'of', 'been', 'has', 'have'])

function meaningfulTokens(key: string): string[] {
  return key ? key.split(' ').filter((t) => t && !STOPWORDS.has(t)) : []
}

function discriminators(tokens: string[]): string {
  return tokens
    .filter((t) => DISCRIMINATORS.has(t) || /^\d+$/.test(t))
    .sort()
    .join('|')
}

/**
 * How much word overlap makes two notes the same miss. Set high, because the
 * cost of wrongly splitting a miss (a slightly understated row) is much lower
 * than the cost of wrongly merging two (a teacher reteaches one thing and
 * misses another).
 */
const NOTE_SIMILARITY = 0.8

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const t of a) if (b.has(t)) shared += 1
  const union = a.size + b.size - shared
  return union ? shared / union : 0
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

      // Classifications that describe the marking rather than the student are
      // dropped here — see MARKING_PROCESS_CLASSIFICATIONS.
      const classification = point.error_classification?.trim().toLowerCase()
      if (classification && !MARKING_PROCESS_CLASSIFICATIONS.has(classification)) {
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

  const mostMissed = clusterMissedPoints([...missed.values()]).slice(0, topMissed)

  const errorBreakdown = [...errors.entries()]
    .map(([classification, count]) => ({
      classification,
      label: classificationLabel(classification),
      count,
    }))
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
 * Merges notes that describe the same miss.
 *
 * Greedy single-pass clustering, largest first, so the most common phrasing
 * becomes the label a teacher reads. Deliberately conservative: two notes merge
 * only when their word overlap clears NOTE_SIMILARITY *and* they agree on every
 * ordinal and number, because "the first policy" and "the second policy" are
 * different marks however similar the sentences are.
 *
 * This is approximate, and says so. The alternative — exact string matching —
 * was measured splitting one miss across five rows on real data.
 */
function clusterMissedPoints(
  raw: { note: string; occurrences: number; students: Set<string> }[]
): MissedPoint[] {
  const prepared = raw
    .map((m) => {
      const tokens = meaningfulTokens(noteKey(m.note))
      return { ...m, tokens: new Set(tokens), discriminator: discriminators(tokens) }
    })
    // Largest first: the winning cluster keeps its own wording as the label.
    .sort((a, b) => b.students.size - a.students.size || b.occurrences - a.occurrences)

  const clusters: {
    note: string
    occurrences: number
    students: Set<string>
    tokens: Set<string>
    discriminator: string
  }[] = []

  for (const item of prepared) {
    const match = clusters.find(
      (c) =>
        c.discriminator === item.discriminator &&
        jaccard(c.tokens, item.tokens) >= NOTE_SIMILARITY
    )
    if (match) {
      match.occurrences += item.occurrences
      for (const s of item.students) match.students.add(s)
      continue
    }
    clusters.push({ ...item, students: new Set(item.students) })
  }

  return clusters
    .map((c) => ({ note: c.note, occurrences: c.occurrences, students: c.students.size }))
    .sort(
      (a, b) =>
        b.students - a.students ||
        b.occurrences - a.occurrences ||
        a.note.localeCompare(b.note)
    )
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
