/**
 * Gemini model routing — single source of truth.
 *
 * Backends (see lib/ai/gemini-config.ts):
 * - Vertex AI (USE_VERTEX_AI=true): service account, us-central1, Dynamic Shared Quota
 * - Gemini API (default): GEMINI_API_KEY
 *
 * Model IDs are the same on both backends for GA Gemini 2.5 models (no -002 suffix).
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro
 */

/** High-quality reasoning: lesson generation, syllabus parse, diagram alt-text, validation. */
export const GEMINI_PRO_MODEL = 'gemini-2.5-pro' as const

/**
 * Fast structured output: tagging, marking, OCR, segmentation, JSON-shaped extraction.
 * gemini-2.0-flash was shut down — use 2.5 Flash.
 */
export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash' as const

/** Vertex AI model IDs (GA — same strings as Gemini API for 2.5). */
export const VERTEX_GEMINI_PRO_MODEL = GEMINI_PRO_MODEL
export const VERTEX_GEMINI_FLASH_MODEL = GEMINI_FLASH_MODEL

/** @deprecated Use GEMINI_FLASH_MODEL — kept for scripts that imported the old name. */
export const GEMINI_TEXT_MODEL = GEMINI_FLASH_MODEL

/** Image generation fallbacks for course diagrams. */
export const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
] as const

export type GeminiModelId =
  | typeof GEMINI_PRO_MODEL
  | typeof GEMINI_FLASH_MODEL
  | (typeof GEMINI_IMAGE_MODELS)[number]

/** Pipeline and product tasks mapped to the correct model tier. */
export type GeminiTask =
  | 'content-generation' // Prompt B lesson JSON
  | 'diagram-description' // Prompt C Phase 2 — diagram region detection + alt-text
  | 'latex-validation' // Prompt C Phase 2 — per-question LaTeX fidelity check
  | 'pdf-extraction' // Prompt C Phase 2 — question paper parse (Gemini Pro)
  | 'validation-coverage' // Prompt B Phase 4 answerability check
  | 'syllabus-extraction' // Prompt C Phase 5
  | 'topic-tagging' // Prompt C Phase 6
  | 'json-repair-retry' // LLM re-prompt after jsonrepair fails
  | 'structured-extraction' // mark-scheme PDF extract, segmentation, classification
  | 'marking' // student answer scoring
  | 'chat' // Omni-AI / study chat
  | 'ocr' // handwriting / paper OCR
  | 'solution' // model worked solutions

const PRO_TASKS: ReadonlySet<GeminiTask> = new Set([
  'content-generation',
  'diagram-description',
  'validation-coverage',
  'syllabus-extraction',
  'solution',
  'pdf-extraction',
])

export function modelForTask(task: GeminiTask): GeminiModelId {
  return PRO_TASKS.has(task) ? GEMINI_PRO_MODEL : GEMINI_FLASH_MODEL
}

/** Mathpix confidence below this triggers Gemini Pro re-extraction when Mathpix is enabled. */
export const MATHPIX_LOW_CONFIDENCE_THRESHOLD = 0.85
