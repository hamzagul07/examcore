/**
 * Shared product vocabulary (CP-01).
 * Prefer these constants over ad-hoc duration / verb wording in UI copy.
 */

/** One student response (typed or photo). */
export const TERM_ANSWER = 'answer'

/** Multi-question script / whole paper. */
export const TERM_PAPER = 'paper'

/** The product action. */
export const TERM_MARK = 'mark'

/** What the student receives. */
export const TERM_FEEDBACK = 'mark-by-mark feedback'

/**
 * Evidence-based single-answer wait range used in marketing and wait UI.
 * Keep in sync with Mark wait messaging — do not invent a second number.
 */
export const MARK_DURATION_SINGLE = 'about a minute'

/** Sentence-case form for mid-paragraph / standalone lines. */
export const MARK_DURATION_SINGLE_SENTENCE = 'About a minute'

/** Compact marketing chip form of the same promise. */
export const MARK_DURATION_SINGLE_SHORT = '~60s'

/** Whole-paper marking can take longer; keep distinct from single-answer copy. */
export const MARK_DURATION_PAPER = 'a few minutes'

/** Input-neutral verbs — avoid click/tap splits. */
export const VERB_OPEN = 'Open'
export const VERB_SELECT = 'Select'
export const VERB_CHOOSE = 'Choose'
export const VERB_PRACTISE = 'Practise'

export function markDurationLead(mode: 'single' | 'paper' = 'single'): string {
  return mode === 'paper'
    ? `Marked in ${MARK_DURATION_PAPER}`
    : `Marked in ${MARK_DURATION_SINGLE}`
}
