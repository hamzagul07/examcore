import {
  ERROR_LABELS,
  normalizeErrorClassification,
  type ErrorClassification,
} from '@/lib/error-classifications'

/**
 * The diagnosis line for the moment the ink lands.
 *
 * The mark reveal is the only point in this product with real emotional charge,
 * which makes it the one place an upgrade ask belongs — and the one place a
 * badly-judged one does damage. Two rules the copy here holds to:
 *
 * 1. **Corrective, never catastrophic.** "You lost 6 marks, 4 of them on
 *    incomplete working" is a fixable, checkable claim. "You're on track to
 *    fail" is unfalsifiable, exploits exam anxiety in a demographic with a real
 *    mental-health baseline, and reads as a sales pitch — which converts worse
 *    *and* is the line most likely to reach a parent.
 * 2. **Only claim a pattern that exists.** One arithmetic slip is not a
 *    pattern. A pattern is named only when the same classification accounts for
 *    at least two lost marks AND at least half the lost marks we could
 *    classify; below that the copy states the count and stops. Inventing a
 *    trend from n=1 is the fastest way for a student to catch us fabricating.
 */

export type MarkAwardedLite = {
  earned: boolean
  error_classification?: string | null
}

export type PostMarkDiagnosis = {
  lostMarks: number
  /** The dominant failure mode, when one genuinely dominates. */
  pattern: {
    classification: ErrorClassification
    /** Lost marks carrying this classification. */
    count: number
    label: string
  } | null
  /** One sentence naming what happened, in the student's own numbers. */
  headline: string
  /** The corrective follow-up. Empty when no pattern was confident enough. */
  detail: string
}

/** Corrective framing per failure mode. Each says what the student did RIGHT
 * before what they lost — a student who reads "your method was fine" keeps
 * reading; one who reads "you don't understand this" closes the tab. */
const CORRECTIVE: Record<ErrorClassification, string> = {
  conceptual:
    'That points at the topic itself rather than exam technique — worth re-reading it properly before drilling more questions on it.',
  algebraic_sign:
    'Your method was right; the marks went on signs and algebra. That is the cheapest kind of mark to win back.',
  arithmetic:
    'Your method was right; the marks went on arithmetic. That is the cheapest kind of mark to win back.',
  incomplete:
    'The approach was there — you stopped before the examiner had enough on the page to award the mark.',
  time_pressure:
    'Several small slips at once usually means the clock rather than the content.',
  no_error: '',
}

const MIN_PATTERN_COUNT = 2

export function buildPostMarkDiagnosis({
  marksAwarded,
  marksEarned,
  totalMarks,
}: {
  marksAwarded: MarkAwardedLite[]
  marksEarned: number
  totalMarks: number
}): PostMarkDiagnosis | null {
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return null
  const lostMarks = Math.max(0, totalMarks - marksEarned)
  if (lostMarks <= 0) return null

  // Only unearned marks carry a diagnosis; 'no_error' on a lost mark means the
  // model declined to classify it, which is not evidence of anything.
  const counts = new Map<ErrorClassification, number>()
  for (const mark of marksAwarded) {
    if (mark.earned) continue
    const c = normalizeErrorClassification(mark.error_classification)
    if (c === 'no_error') continue
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }

  const classified = [...counts.values()].reduce((a, b) => a + b, 0)
  let pattern: PostMarkDiagnosis['pattern'] = null
  if (classified > 0) {
    let topClass: ErrorClassification | null = null
    let topCount = 0
    for (const [c, n] of counts) {
      if (n > topCount) {
        topCount = n
        topClass = c
      }
    }
    if (topClass && topCount >= MIN_PATTERN_COUNT && topCount * 2 >= classified) {
      pattern = {
        classification: topClass,
        count: topCount,
        label: ERROR_LABELS[topClass].label.toLowerCase(),
      }
    }
  }

  const markWord = lostMarks === 1 ? 'mark' : 'marks'
  const headline = pattern
    ? `You lost ${lostMarks} ${markWord} — ${
        pattern.count === lostMarks ? 'all' : pattern.count
      } of them to ${pattern.label}.`
    : `You lost ${lostMarks} ${markWord} on this question.`

  return {
    lostMarks,
    pattern,
    headline,
    detail: pattern ? CORRECTIVE[pattern.classification] : '',
  }
}
