import { normalizeMarkdownTables } from '@/lib/rich-text/normalize-marking-text'
import {
  promoteBareBeginEnvironments,
  promoteEnvironmentsToDisplay,
  sanitizeMathDelimitersInText,
} from '@/lib/rich-text/sanitize-latex'
import { wrapBareMathRuns } from '@/lib/rich-text/wrap-bare-math'

export { wrapBareMathRuns } from '@/lib/rich-text/wrap-bare-math'

/**
 * Wrap math in `$...$` for question text that arrives WITHOUT LaTeX delimiters
 * (Gemini PDF extraction / question-photo OCR). Also sanitizes already-delimited
 * fragments (unsupported commands, unicode, double-escapes).
 */

export function normalizeQuestionText(text: string): string {
  if (!text) return text

  const withTables = normalizeMarkdownTables(text)
  const wrapped = wrapBareMathRuns(withTables)
  const promoted = promoteEnvironmentsToDisplay(
    promoteBareBeginEnvironments(wrapped)
  )
  return sanitizeMathDelimitersInText(promoted)
}
