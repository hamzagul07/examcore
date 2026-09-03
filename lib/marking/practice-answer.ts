/**
 * Carrying a typed answer from a topic page into the practice deep link.
 *
 * The topic-question pages (/past-papers/[code]/[topic] and the IB twin) list
 * real past-paper questions, each linking to /mark?practice=1&paper=…&q=… —
 * which pre-selects the paper, session and question number so the student only
 * has to write. That link is good, and it still asks them to leave the page
 * they are reading before they have written a word. Measured over 30 days to
 * 2026-08-29: 1,891 sessions landed on a product surface and 86 began an
 * answer.
 *
 * This lets the writing happen where the question is. The answer travels; the
 * QUESTION deliberately does not.
 *
 * Why not reuse `lib/courses/mark-handoff.ts`: that carries a question AND an
 * answer, because a lesson quick check owns its question text. Here the stems
 * are shortened previews — 130 characters, ellipsis and all — and the real
 * question is resolved server-side from the paper reference already in the
 * link. Sending a truncated stem as the question would have the examiner mark
 * against half a question, which is worse than not prefilling at all.
 *
 * Kept in sessionStorage rather than the URL for the same reason as the lesson
 * handoff: a student's prose does not belong in a query string that lands in
 * history, referrer headers and any analytics in between.
 *
 * Pure apart from the storage calls, so the validation and the one-shot
 * behaviour are testable.
 */

export const PRACTICE_ANSWER_KEY = 'ms:practice-answer'

/**
 * Matches MIN_TYPED_ANSWER in app/mark/page.tsx and the answer floor in
 * isUsableHandoff. Below this the marker would refuse the submission anyway,
 * so there is nothing worth carrying.
 */
export const MIN_PRACTICE_ANSWER = 12

/** Generous for a single question, far below the ~5MB storage budget. */
export const MAX_PRACTICE_ANSWER_CHARS = 20_000

/** True when this answer is worth carrying to the marker. */
export function isUsablePracticeAnswer(answer: string | null | undefined): answer is string {
  return typeof answer === 'string' && answer.trim().length >= MIN_PRACTICE_ANSWER
}

/**
 * Store the answer and return the URL to send the student to.
 *
 * `markHref` already carries `practice=1` and the paper reference — it comes
 * straight from the question cache — so nothing is appended to it here.
 */
export function stashPracticeAnswer(answer: string, markHref: string): string {
  if (!isUsablePracticeAnswer(answer)) return markHref
  try {
    window.sessionStorage.setItem(
      PRACTICE_ANSWER_KEY,
      answer.trim().slice(0, MAX_PRACTICE_ANSWER_CHARS)
    )
  } catch {
    // Private mode or a full quota: the link still works, it just arrives
    // empty rather than failing to navigate.
  }
  return markHref
}

/**
 * The bound app/mark/page.tsx accepts for a typed total (parsedTotalMarksInput).
 * Outside it the marker ignores the value, so there is no point carrying it.
 */
const MAX_TOTAL_MARKS = 100

/**
 * Add a question's mark total to a practice deep link.
 *
 * "We could not read the total marks from your question" is the single
 * commonest way a mark fails: 11 of the 17 recorded failures to 2026-08-29,
 * still occurring on 28 Aug. It fires AFTER the student has waited, and it
 * asks them to go back and type a number that was printed on the paper.
 *
 * The topic-question cache already knows this number for all 1,181 banked
 * questions, so on that path the marker never has to read it off an image.
 * /mark only shows its total-marks field when the banked scheme did not supply
 * one, which is exactly the failing case — when the scheme does supply it, the
 * carried value is simply unused.
 *
 * A small integer, unlike the answer prose, is fine in a query string.
 */
export function withTotalMarks(href: string, marks: number | null | undefined): string {
  if (typeof marks !== 'number' || !Number.isFinite(marks)) return href
  const n = Math.round(marks)
  if (n <= 0 || n > MAX_TOTAL_MARKS) return href
  // Relative hrefs need a base; the origin is discarded again below.
  const url = new URL(href, 'https://markscheme.invalid')
  url.searchParams.set('marks', String(n))
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Read the answer exactly once.
 *
 * Cleared on read so that reloading /mark, or coming back to it later, does
 * not silently refill the box with an answer already dealt with.
 */
export function takePracticeAnswer(): string | null {
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(PRACTICE_ANSWER_KEY)
    window.sessionStorage.removeItem(PRACTICE_ANSWER_KEY)
  } catch {
    return null
  }
  if (!isUsablePracticeAnswer(raw)) return null
  return raw.trim().slice(0, MAX_PRACTICE_ANSWER_CHARS)
}
