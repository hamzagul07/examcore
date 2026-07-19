/**
 * Builds the /mark deep-link for the "Drill this" loop. The /mark page reads
 * these params to preload the exact recommended question and show a practice
 * banner, then returns the student to the insights dashboard afterwards.
 */

import type { Recommendation } from './types'

export function drillHref(rec: Recommendation, patternLabel?: string): string {
  const params = new URLSearchParams({
    practice: '1',
    paper: rec.paperCode,
    session: rec.paperSession,
    q: rec.questionNumber,
    reason: rec.reason,
    pattern: patternLabel || rec.targetLabel,
    return: 'progress',
  })
  return `/mark?${params.toString()}`
}

/**
 * /mark deep-link for an IB topic drill. IB has no stored past-paper question, so
 * /mark generates one for this topic (see /api/mark/topic-question). Matches the
 * existing `subject`+`topic` course-lesson deep-link the mark page already reads.
 */
export function topicDrillHref(subjectCode: string, topicCode: string): string {
  const params = new URLSearchParams({
    subject: subjectCode,
    topic: topicCode,
    return: 'progress',
  })
  return `/mark?${params.toString()}`
}
