/** Keep in sync with lib/ai/gemini-models.ts — model IDs work on Vertex AI and Gemini API. */

export const GEMINI_PRO_MODEL = 'gemini-2.5-pro'
export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'

/** @deprecated Use GEMINI_FLASH_MODEL */
export const GEMINI_TEXT_MODEL = GEMINI_FLASH_MODEL

export const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
]

const PRO_TASKS = new Set([
  'content-generation',
  'diagram-description',
  'validation-coverage',
  'syllabus-extraction',
  'solution',
  'pdf-extraction',
])

export function modelForTask(task) {
  return PRO_TASKS.has(task) ? GEMINI_PRO_MODEL : GEMINI_FLASH_MODEL
}

export const MATHPIX_LOW_CONFIDENCE_THRESHOLD = 0.85
