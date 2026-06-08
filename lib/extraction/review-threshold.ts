import { LOW_EXTRACTION_CONFIDENCE_THRESHOLD } from './config'

/**
 * Per-paper confidence thresholds for topic-tag human review queue.
 *
 * Papers 3 (practical) and 5 (planning) involve genuinely higher ambiguity —
 * multi-skill questions and method-vs-content overlap — so we flag below 0.75.
 * Papers 1, 2, 4 use the default 0.6 extraction threshold.
 */
export function topicTagReviewThreshold(paperNumber: string): number {
  if (paperNumber === '3' || paperNumber === '5') return 0.75
  return LOW_EXTRACTION_CONFIDENCE_THRESHOLD
}

export function needsHumanReviewForConfidence(
  confidence: number,
  paperNumber: string
): boolean {
  return confidence < topicTagReviewThreshold(paperNumber)
}
