import type { MarkAwarded } from './types'

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
