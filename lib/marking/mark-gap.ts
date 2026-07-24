import type { IbCriterionResult, LorBandResult, MarkAwarded } from './types'
import type { RubricBand } from './mark-scheme-display'

/**
 * The Mark Gap: the marks that were AVAILABLE but not awarded, each paired with
 * the specific thing that would have earned it.
 *
 * The examiner ink overlay already shows what was earned (ticks anchored to the
 * student's script). The gap is the negative space — the marks the student
 * never wrote, which by definition have no place on their page. This turns
 * "4 / 6" into "here are the two marks and exactly what each one needed".
 *
 * `fix`/`earns` come from the premium full-marks rewrite; without it the item
 * still carries the examiner's reasoning, so free users see the gap and paid
 * users additionally see how to close it.
 */
export type MarkGapItem = {
  /** Mark code shown to the student, e.g. "A1", "B1". */
  markId: string
  type: string
  /** Why the mark wasn't awarded (examiner reasoning). Always present. */
  reasoning: string
  errorClassification: string | null
  /**
   * The snippet of the student's own working this mark relates to. When it
   * matches a line on the script, the overlay anchors the fix inline beneath
   * that line; otherwise the fix falls back to the side panel.
   */
  anchorSnippet: string | null
  /** Premium: the addition that earns this mark, from the rewrite. */
  fix: string | null
  /** What the fix earns, verbatim from the rewrite annotation. */
  earns: string | null
}

export type MarkGap = {
  earned: number
  total: number
  /** Marks available but not awarded, each paired with its fix when known. */
  items: MarkGapItem[]
}

/** Uppercased alphanumerics only, so "A1", "a1.", "(A1)" all compare equal. */
function markToken(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Pair each missed mark with the rewrite annotation that earns it.
 *
 * Annotations carry free-text `earns` ("A1", "the A1 accuracy mark", "+1
 * band"), so we first match on the mark's code appearing in that text, then
 * pair whatever's left by order — a rewrite that names its additions loosely
 * still lights up every gap card it has an annotation for.
 */
function pairFixes(
  missed: MarkAwarded[],
  annotations: Array<{ text: string; earns: string }>
): Map<MarkAwarded['mark_id'], { text: string; earns: string }> {
  const byMark = new Map<MarkAwarded['mark_id'], { text: string; earns: string }>()
  const pool = [...annotations]

  // Pass 1: explicit code match ("A1" inside "earns the A1 mark").
  for (const mark of missed) {
    const token = markToken(mark.type)
    if (!token) continue
    const idx = pool.findIndex((a) => markToken(a.earns).includes(token))
    if (idx >= 0) {
      byMark.set(mark.mark_id, pool[idx])
      pool.splice(idx, 1)
    }
  }
  // Pass 2: order-based fallback for anything still unpaired.
  for (const mark of missed) {
    if (byMark.has(mark.mark_id)) continue
    const next = pool.shift()
    if (next) byMark.set(mark.mark_id, next)
  }
  return byMark
}

export function buildMarkGap(
  aiMarking: {
    marks_awarded?: MarkAwarded[] | null
    full_marks_rewrite?: {
      rewritten_answer: string
      annotations: Array<{ text: string; earns: string }>
    } | null
  },
  earned: number,
  total: number
): MarkGap {
  const marks = aiMarking.marks_awarded ?? []
  const missed = marks.filter((m) => !m.earned)
  const fixes = pairFixes(missed, aiMarking.full_marks_rewrite?.annotations ?? [])

  const items: MarkGapItem[] = missed.map((m) => {
    const fix = fixes.get(m.mark_id) ?? null
    return {
      markId: String(m.type || m.mark_id),
      type: m.type,
      reasoning: m.reasoning?.trim() || 'Mark not awarded.',
      errorClassification: m.error_classification ?? null,
      anchorSnippet: m.line_reference?.trim() || null,
      fix: fix?.text?.trim() || null,
      earns: fix?.earns?.trim() || null,
    }
  })

  return { earned, total, items }
}

/**
 * Fixes keyed by mark code, for the overlay to anchor inline beneath the line
 * each mark relates to. Only items that carry both an anchor snippet and a fix
 * can be placed on the script; the rest stay in the panel.
 */
export function inlineGhostFixes(
  gap: MarkGap
): Record<string, { text: string; earns: string }> {
  const out: Record<string, { text: string; earns: string }> = {}
  for (const item of gap.items) {
    if (item.anchorSnippet && item.fix) {
      out[markToken(item.markId)] = {
        text: item.fix,
        earns: item.earns ?? `+1 ${item.markId}`,
      }
    }
  }
  return out
}

/**
 * Level-of-response marking has no ticks to place — the gap is the band above
 * you. Each rung is a rubric level; `next` is the one directly above the
 * achieved band, and `liftHint` is the single concrete move to reach it.
 */
export type BandRung = {
  level: number
  descriptor: string
  marksMax: number
  state: 'below' | 'current' | 'next' | 'above'
}

export type BandGap = {
  level: number
  marksAwarded: number
  marksAvailable: number
  /** The rung directly above the achieved band, when the rubric describes it. */
  next: BandRung | null
  /** One concrete move to reach the next band. */
  liftHint: string | null
  /** Full ladder, highest level first, when the rubric is present. */
  ladder: BandRung[]
}

function rungState(level: number, current: number): BandRung['state'] {
  if (level === current) return 'current'
  if (level === current + 1) return 'next'
  return level > current ? 'above' : 'below'
}

/**
 * IB multi-criterion (EE, TOK, arts). Each criterion is its own little band,
 * but the data carries only the achieved descriptor — there is no full ladder
 * to climb. So the gap here is the shape: which criteria cost the most marks,
 * and the examiner's "how to move up" for each (the `improvements` the criteria
 * strip otherwise never shows).
 */
export type CriterionGap = {
  criterion: string
  name: string
  level: number
  awarded: number
  available: number
  lost: number
  /** The examiner's how-to-improve for this criterion, if given. */
  lift: string | null
}

export type CriteriaGap = {
  totalAwarded: number
  totalAvailable: number
  totalLost: number
  /** Criteria that lost marks, most-lost first — where the marks actually went. */
  gaps: CriterionGap[]
}

export function buildCriteriaGap(criteria: IbCriterionResult[]): CriteriaGap {
  let totalAwarded = 0
  let totalAvailable = 0
  const all: CriterionGap[] = criteria.map((c) => {
    totalAwarded += c.marks_awarded
    totalAvailable += c.marks_available
    return {
      criterion: c.criterion,
      name: c.criterion_name,
      level: c.level,
      awarded: c.marks_awarded,
      available: c.marks_available,
      lost: Math.max(0, c.marks_available - c.marks_awarded),
      lift: c.improvements?.[0]?.trim() || null,
    }
  })
  return {
    totalAwarded,
    totalAvailable,
    totalLost: totalAvailable - totalAwarded,
    gaps: all.filter((g) => g.lost > 0).sort((a, b) => b.lost - a.lost),
  }
}

export function buildBandGap(
  bandResult: LorBandResult,
  bands: RubricBand[] | null | undefined,
  rewrite?: { annotations: Array<{ text: string; earns: string }> } | null
): BandGap {
  const ladder: BandRung[] = [...(bands ?? [])]
    .sort((a, b) => b.level - a.level)
    .map((b) => ({
      level: b.level,
      descriptor: b.descriptor,
      marksMax: b.marks_max,
      state: rungState(b.level, bandResult.level),
    }))
  const next = ladder.find((r) => r.state === 'next') ?? null

  // Prefer a rewrite annotation that names a band/level lift, then the
  // examiner's first improvement, then the next band's own descriptor.
  const bandAnnotation = rewrite?.annotations.find((a) => /band|level/i.test(a.earns))
  const liftHint =
    bandAnnotation?.text?.trim() ||
    bandResult.improvements?.[0]?.trim() ||
    next?.descriptor ||
    null

  return {
    level: bandResult.level,
    marksAwarded: bandResult.marks_awarded,
    marksAvailable: bandResult.marks_available,
    next,
    liftHint,
    ladder,
  }
}
