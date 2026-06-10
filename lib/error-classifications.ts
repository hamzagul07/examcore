/**
 * Error classifications produced by Claude during marking.
 *
 * The classification is what distinguishes "you got the wrong answer because
 * you don't understand the topic" from "you got the wrong answer because you
 * dropped a minus sign". The two need entirely different remediation, and the
 * Mastery Matrix + Action Plan will lean on these labels in future sprints.
 *
 * Codes are persisted to `attempts.error_classifications` so we never want to
 * rename one — only add new variants.
 */

export type ErrorClassification =
  | 'conceptual'
  | 'algebraic_sign'
  | 'arithmetic'
  | 'incomplete'
  | 'time_pressure'
  | 'no_error'

export interface ErrorClassificationDetail {
  classification: ErrorClassification
  /** Mark code this applies to, e.g. "B1", "M1", "A1". */
  mark_id: string
  /** Brief, one-sentence explanation. */
  description: string
  /** Short snippet from the OCR line, used for positional matching. */
  line_reference?: string
}

export const ERROR_LABELS: Record<
  ErrorClassification,
  { label: string; color: string; icon: string; description: string }
> = {
  conceptual: {
    label: 'Conceptual error',
    color: '#ef4444',
    icon: '🧠',
    description: 'Wrong approach or misunderstanding of the topic.',
  },
  algebraic_sign: {
    label: 'Algebraic / sign error',
    color: '#f97316',
    icon: '±',
    description: 'Right method, but a sign or algebraic slip lost the mark.',
  },
  arithmetic: {
    label: 'Arithmetic slip',
    color: '#f59e0b',
    icon: '×',
    description: 'Right method, but a computational error.',
  },
  incomplete: {
    label: 'Incomplete working',
    color: '#eab308',
    icon: '…',
    description: 'Right approach, but you stopped before finishing.',
  },
  time_pressure: {
    label: 'Time pressure',
    color: '#a855f7',
    icon: '⏱',
    description: 'Rushed: multiple small errors that look unlike your usual work.',
  },
  no_error: {
    label: 'Correct',
    color: '#2f6b4f',
    icon: '✓',
    description: 'You earned this mark cleanly.',
  },
}

/** Whitelist used when normalising LLM-emitted classifications. */
export const VALID_ERROR_CLASSIFICATIONS: Set<ErrorClassification> = new Set([
  'conceptual',
  'algebraic_sign',
  'arithmetic',
  'incomplete',
  'time_pressure',
  'no_error',
])

export function normalizeErrorClassification(
  raw: unknown
): ErrorClassification {
  if (typeof raw !== 'string') return 'no_error'
  const trimmed = raw.trim().toLowerCase().replace(/[-\s]+/g, '_')
  if (VALID_ERROR_CLASSIFICATIONS.has(trimmed as ErrorClassification)) {
    return trimmed as ErrorClassification
  }
  return 'no_error'
}

/**
 * Build a quick-scan summary of error classifications across an attempt's
 * marks. Used for analytics in future sprints; tucked here so the shape stays
 * close to the enum definition.
 */
export function summarizeClassifications(
  details: ErrorClassificationDetail[]
): Record<ErrorClassification, number> {
  const summary: Record<ErrorClassification, number> = {
    conceptual: 0,
    algebraic_sign: 0,
    arithmetic: 0,
    incomplete: 0,
    time_pressure: 0,
    no_error: 0,
  }
  for (const d of details) {
    summary[d.classification] = (summary[d.classification] ?? 0) + 1
  }
  return summary
}
