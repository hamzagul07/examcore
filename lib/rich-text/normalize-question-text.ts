import { normalizeMarkdownTables } from '@/lib/rich-text/normalize-marking-text'

/**
 * Wrap obvious math in `$...$` for question text that arrives WITHOUT LaTeX
 * delimiters (Gemini PDF extraction / question-photo OCR produce plain text
 * like `x^2` and `(1 - 4x)^6`). The marking result page renders question_text
 * through RichTextRenderer (remark-math + KaTeX), which only renders math that
 * is already `$...$` delimited — so undelimited math shows as raw text.
 *
 * This is intentionally CONSERVATIVE: it only wraps two unambiguous patterns
 * (an exponent on a single variable, or on a parenthesised expression). Bare
 * equations, fractions, and prose are left untouched — a false positive that
 * corrupts the question wording is far worse than under-wrapping.
 *
 * Going forward, new extractions get proper `$...$` from the updated Gemini
 * prompt; this normalizer is the render-time safety net for OCR output and for
 * questions already cached in the DB without delimiters.
 */

const STASH = '\x00Q'

export function normalizeQuestionText(text: string): string {
  if (!text) return text

  const withTables = normalizeMarkdownTables(text)

  // Already contains LaTeX delimiters — skip math wrapping only (tables still normalized).
  if (/\$[^$]+\$/.test(withTables)) return withTables

  const stashed: string[] = []
  const stash = (s: string): string => {
    stashed.push(s)
    return `${STASH}${stashed.length - 1}\x00`
  }

  let out = withTables

  // Pattern A: (expr)^power — a parenthesised base that contains a variable or
  // operator, raised to a digit / letter / braced exponent. e.g. (1 - 4x)^6.
  out = out.replace(
    /\(([^()\n]*[A-Za-z+\-*/=][^()\n]*)\)\^(\{[^}]+\}|\d+|[A-Za-z])/g,
    (_m, base: string, exp: string) => stash(`$(${base})^${exp}$`)
  )

  // Pattern B: letter^power — a single-letter base raised to a power. The
  // negative lookbehind keeps us out of mid-word/identifier carets (e.g.
  // "tan^2") and LaTeX commands ("\sum^").
  out = out.replace(
    /(?<![A-Za-z\\])([A-Za-z])\^(\{[^}]+\}|\d+|[A-Za-z])/g,
    (_m, base: string, exp: string) => stash(`$${base}^${exp}$`)
  )

  // Restore wrapped regions.
  out = out.replace(
    new RegExp(`${STASH}(\\d+)\\x00`, 'g'),
    (_m, i: string) => stashed[parseInt(i, 10)]
  )

  return out
}
