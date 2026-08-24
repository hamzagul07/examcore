/**
 * Shared product vocabulary (CP-01).
 * Prefer these constants over ad-hoc duration / verb wording in UI copy.
 */

/**
 * The primary call to action — one action, one name.
 *
 * This existed in five phrasings, three of them on the landing page alone: the
 * header said "Mark a question", the hero button "Feel the first stamp — free",
 * the closing button "Mark one question free", the pillars "Mark a question —
 * free", and the blog footer "Mark a question — free, no account". A reader
 * scrolling one page met three names for the same button, which reads as three
 * offers rather than one.
 *
 * "— free" is carried in the label rather than a caption because price is the
 * objection the click has to survive, and the compact form drops it only where
 * navigation chrome genuinely cannot fit it.
 */
export const CTA_MARK = 'Mark a question — free'

/** Nav and other tight chrome, where the qualifier does not fit. */
export const CTA_MARK_COMPACT = 'Mark a question'

/** Whole-paper equivalent of CTA_MARK. */
export const CTA_MARK_PAPER = 'Mark a paper — free'

/**
 * Board- or subject-qualified CTA: markCtaLabel('9709') -> 'Mark a 9709
 * question — free'. Falls back to the unqualified label so a caller with no
 * subject in hand cannot accidentally invent a sixth phrasing.
 */
export function markCtaLabel(qualifier?: string | null): string {
  const q = qualifier?.trim()
  return q ? `Mark a${/^[AEIOU]/i.test(q) ? 'n' : ''} ${q} question — free` : CTA_MARK
}

/**
 * Plain-English glosses for the named product features.
 *
 * The rule these exist to enforce: metaphor lives in headlines; anywhere a
 * decision is made — buttons, plan cards, feature lists, FAQ — a product name
 * appears only WITH its gloss the first time a page uses it. The pricing page
 * was naming Vault, Cinema and the Sunday coach with no definition anywhere,
 * and pricing is the page a parent reads before typing a card number.
 *
 * Each line is grounded in what the feature actually does (features.ts, the
 * Max vault components), so the gloss is a description, not more poetry.
 */
export const GLOSS_VAULT =
  'a revision desk per subject, rebuilt from your own marked answers'
export const GLOSS_CINEMA =
  'animated diagrams you can play and scrub until the idea clicks'
export const GLOSS_SUNDAY_COACH =
  'a weekly email that reads your marks back to you and says what to drill'
export const GLOSS_EXAMINERS_INK =
  'your answer with scheme codes stamped in the margin, and the reason beside each'

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
