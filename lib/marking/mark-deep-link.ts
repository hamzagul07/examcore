/**
 * The query parameters /mark reads from a deep link.
 *
 * Three page families put an answer box in front of a student and send what
 * they write to /mark, each landing on a different branch selected purely by
 * which parameters are present:
 *
 *   /past-papers/[code]/[topic]        →  /mark?practice=1&paper=…&q=…
 *   /ib/past-papers/[slug]/[topic]     →  /mark?subject=…&topic=…
 *   /ib/past-papers/[slug]             →  /mark?subject=…
 *
 * Nothing in the type system connected the two sides: renaming a parameter on
 * either left the student on a blank marker with the answer they had just
 * typed silently dropped, and every page still built. These names are the
 * contract; `mark-deep-link.test.ts` asserts the real cached link data against
 * them, and the /mark effects read through them.
 */
import { MAX_TOTAL_MARKS } from './total-marks-input'

export const MARK_DEEP_LINK = {
  /** `practice=1` selects the banked past-paper branch. */
  practiceFlag: 'practice',
  practiceValue: '1',
  /** `paper=9709/12` — the paper reference the practice branch resolves. */
  paper: 'paper',
  /** Session as a short code (`w24`) or a long label. */
  session: 'session',
  /** Question number; `question` is the older spelling still honoured. */
  questionKeys: ['q', 'question'] as const,
  /** Course / IB topic links: subject code, optionally with a topic code. */
  subject: 'subject',
  topic: 'topic',
  /** The question's known total, carried so the marker never has to guess. */
  marks: 'marks',
  /** Where to send the student back afterwards. */
  returnTo: 'return',
} as const

/** The bound a carried `marks=` value must satisfy to be taken. */
export const MARK_DEEP_LINK_MAX_MARKS = MAX_TOTAL_MARKS

/** The question number a link carries, under either accepted key. */
export function deepLinkQuestion(sp: URLSearchParams): string {
  for (const key of MARK_DEEP_LINK.questionKeys) {
    const value = sp.get(key)
    if (value) return value
  }
  return ''
}

export function isPracticeDeepLink(sp: URLSearchParams): boolean {
  return sp.get(MARK_DEEP_LINK.practiceFlag) === MARK_DEEP_LINK.practiceValue
}
