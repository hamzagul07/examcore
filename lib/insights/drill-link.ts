/**
 * Builds the /mark deep-link for the "Drill this" loop. The /mark page reads
 * these params to preload the exact recommended question and show a practice
 * banner, then returns the student to the insights dashboard afterwards.
 */

import type { Recommendation } from './types'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'

export function drillHref(
  rec: Recommendation,
  patternLabel?: string,
  opts?: { returnTo?: 'progress' | 'vault' }
): string {
  return pastPaperMarkHref({
    paperCode: rec.paperCode,
    paperSession: rec.paperSession,
    questionNumber: rec.questionNumber,
    reason: rec.reason,
    pattern: patternLabel || rec.targetLabel,
    returnTo: opts?.returnTo ?? 'progress',
  })
}

/**
 * /mark deep-link for an IB topic drill. IB has no stored past-paper question, so
 * /mark generates one for this topic (see /api/mark/topic-question). Matches the
 * existing `subject`+`topic` course-lesson deep-link the mark page already reads.
 */
export function topicDrillHref(
  subjectCode: string,
  topicCode: string,
  opts?: { returnTo?: 'progress' | 'vault' }
): string {
  const params = new URLSearchParams({
    subject: subjectCode,
    topic: topicCode,
    return:
      opts?.returnTo === 'vault'
        ? '/dashboard/vault'
        : '/dashboard/progress?tab=insights',
  })
  return `/mark?${params.toString()}`
}
