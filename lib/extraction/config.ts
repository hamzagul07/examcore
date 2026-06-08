/**
 * Extraction pipeline configuration (Prompt C Phase 2).
 * Gemini Pro is primary; Mathpix is feature-flagged off by default.
 */

/** Below this confidence, questions are queued for manual review / re-extraction. */
export const LOW_EXTRACTION_CONFIDENCE_THRESHOLD = 0.6

/** Max question nesting depth (e.g. 4(a)(i) = depth 2). */
export const MAX_QUESTION_NESTING_DEPTH = 2

/** Default extraction method written to extracted_questions. */
export const DEFAULT_EXTRACTION_METHOD = 'gemini-pro' as const

/**
 * Mathpix is disabled unless EXTRACTION_USE_MATHPIX=true.
 * Scaffolding remains in lib/extraction/mathpix-client.mjs for future revival.
 */
export function useMathpix(): boolean {
  return process.env.EXTRACTION_USE_MATHPIX === 'true'
}

/** Max re-extraction attempts before permanent manual-review queue. */
export const MAX_EXTRACTION_RETRIES = 2
