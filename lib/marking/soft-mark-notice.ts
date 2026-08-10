/**
 * Calm recovery copy when a mark does not finish. Deliberately not framed as an
 * "error" — uploads stay, the student just taps Mark again.
 *
 * Actionable client/OCR messages are kept (softened) so students know what to
 * fix; opaque model/infra failures collapse to the generic retry line.
 */

export const SOFT_MARK_RETRY_NOTICE =
  "We couldn't finish marking this time. Your upload is still here — tap Mark again when you're ready."

/** Client-side missing total — nudge, not a failure. */
export const SOFT_TOTAL_MARKS_NOTICE =
  'Add the total marks for this question (or tick that they are shown in the question), then tap Mark again.'

const ACTIONABLE_PATTERNS: Array<{ test: RegExp; notice: string }> = [
  {
    test: /total marks for this question|read the total marks/i,
    notice: SOFT_TOTAL_MARKS_NOTICE,
  },
  {
    test: /handwriting|couldn't read your|no handwriting/i,
    notice:
      "We couldn't read the handwriting clearly. Try a flatter photo with good light, then tap Mark again.",
  },
  {
    test: /find a question in your upload|Add the question|Add your question|need the question/i,
    notice:
      'Add the question too — type it, photograph it, or pick the paper — then tap Mark again.',
  },
  {
    test: /select a subject/i,
    notice: 'Pick a subject above so we mark with the right criteria, then tap Mark again.',
  },
  {
    test: /past paper question/i,
    notice:
      'We could not match this to a past paper. Add a photo of the question or type it, then tap Mark again.',
  },
]

const INFRA_NOISE =
  /gemini|vertex|timeout|ETIMEDOUT|429|resource exhausted|overloaded|ECONN|fetch failed|TypeError|Internal server|status 5\d\d|did not match the expected pattern/i

export function isTotalMarksClientMessage(message: string): boolean {
  return /total marks for this question|read the total marks/i.test(message)
}

export function softNoticeForMarkFailure(
  message: string | null | undefined
): string {
  if (!message) return SOFT_MARK_RETRY_NOTICE
  for (const { test, notice } of ACTIONABLE_PATTERNS) {
    if (test.test(message)) return notice
  }
  if (INFRA_NOISE.test(message)) return SOFT_MARK_RETRY_NOTICE

  // Keep short human validation copy so students know what to fix.
  const trimmed = message.trim()
  if (
    trimmed.length > 0 &&
    trimmed.length <= 220 &&
    !/at \w+\s*\(|^\s*Error:|stack/i.test(trimmed)
  ) {
    return trimmed
  }
  return SOFT_MARK_RETRY_NOTICE
}
