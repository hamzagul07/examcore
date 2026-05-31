/**
 * Normalize math notation in marking output text.
 *
 * Claude sometimes ignores the LaTeX delimiter instruction and wraps math
 * in parens like `(\binom{6}{2})` instead of `$\binom{6}{2}$`. This module
 * converts those cases to proper LaTeX delimiters server-side, so the
 * client renderer (remark-math + rehype-katex) picks them up correctly.
 *
 * It also deduplicates cases where Claude outputs the same equation twice
 * (once as inline prose, once as an adjacent display block).
 *
 * Design principles:
 * - Conservative: only convert parenthesised groups whose contents contain
 *   unambiguous math markers (a LaTeX command, or a super/subscript). This
 *   leaves sub-part labels like "(a)", "(b)(i)", "(M1)", "(see below)" and
 *   ordinary prose parentheticals untouched.
 * - Balanced-paren aware: math frequently contains nested parens such as
 *   `(-4)` or `(2)^3`, so we match balanced groups rather than using a
 *   simple regex.
 * - Existing `$...$` / `$$...$$` spans are skipped verbatim so we never
 *   double-wrap already-correct math.
 * - Better to under-normalize than to mangle non-math text.
 */

/** True if the inner content of a paren group looks unambiguously like math. */
function looksLikeMath(inner: string): boolean {
  const s = inner.trim()
  if (!s) return false
  // A LaTeX command (\frac, \binom, \times, \theta, ...)
  const hasCommand = /\\[a-zA-Z]/.test(s)
  // A super/subscript applied to a digit, letter, brace, or paren: x^2, a_1, ^{...}
  const hasSupSub = /[\^_][{(\dA-Za-z]/.test(s)
  return hasCommand || hasSupSub
}

/**
 * Convert parenthesised math expressions to inline `$...$` delimiters.
 * Walks the string, skipping existing `$...$`/`$$...$$` spans, and replaces
 * balanced `(...)` groups whose contents look like math.
 */
function convertParenMathToDelimiters(text: string): string {
  let out = ''
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]

    // Skip over existing math spans verbatim ($$...$$ first, then $...$).
    if (ch === '$') {
      const isDouble = text[i + 1] === '$'
      const delim = isDouble ? '$$' : '$'
      const end = text.indexOf(delim, i + delim.length)
      if (end === -1) {
        // Unterminated delimiter — copy the rest as-is.
        out += text.slice(i)
        break
      }
      out += text.slice(i, end + delim.length)
      i = end + delim.length
      continue
    }

    if (ch === '(') {
      // Find the matching close paren, respecting nesting.
      let depth = 0
      let j = i
      let hitDollar = false
      for (; j < n; j++) {
        const c = text[j]
        if (c === '$') {
          hitDollar = true
          break
        }
        if (c === '(') depth++
        else if (c === ')') {
          depth--
          if (depth === 0) break
        }
      }

      if (!hitDollar && j < n && depth === 0) {
        const inner = text.slice(i + 1, j)
        if (looksLikeMath(inner)) {
          out += `$${inner}$`
          i = j + 1
          continue
        }
      }
      // Not math (or unbalanced / contains a delimiter) — emit literally.
      out += ch
      i++
      continue
    }

    out += ch
    i++
  }

  return out
}

/** Reduce a string to a comparison key: drop LaTeX commands, keep [a-z0-9]. */
function alnumKey(s: string): string {
  return s
    .replace(/\\[a-zA-Z]+/g, '') // strip LaTeX command names (\times, \frac, ...)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Remove a "prose" copy of an equation that immediately precedes its
 * `$$...$$` display block. Claude sometimes emits the rendered-looking prose
 * (e.g. `240=12×80a2`) directly followed by the LaTeX display block.
 */
function dedupeDisplayMath(text: string): string {
  let out = ''
  let i = 0
  const n = text.length

  while (i < n) {
    // Detect a display block at the current position.
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end !== -1) {
        const inner = text.slice(i + 2, end)
        const block = text.slice(i, end + 2)
        const key = alnumKey(inner)

        // Only dedupe substantial, digit-bearing equations to stay safe.
        if (key.length >= 6 && /[0-9]/.test(key)) {
          out = trimDuplicatedTail(out, key)
        }
        out += block
        i = end + 2
        continue
      }
    }

    // Skip inline spans verbatim so we never trim inside one.
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end !== -1) {
        out += text.slice(i, end + 1)
        i = end + 1
        continue
      }
    }

    out += text[i]
    i++
  }

  return out
}

/**
 * If the tail of `out` (ignoring/stripping non-alnum chars, and not crossing
 * a `$` boundary) equals `key`, remove that tail. Returns the trimmed string.
 */
function trimDuplicatedTail(out: string, key: string): string {
  let collected = ''
  let cut = out.length
  for (let k = out.length - 1; k >= 0; k--) {
    const c = out[k]
    if (c === '$') break // don't cross into an existing math span
    if (/[a-z0-9]/i.test(c)) {
      collected = c.toLowerCase() + collected
      cut = k
      if (collected.length === key.length) break
      if (collected.length > key.length) return out // overshot, no clean match
    }
    // non-alnum chars (spaces, =, ×, etc.) are skipped but kept in scan range
  }
  if (collected === key) {
    // Drop everything from `cut` onward (the duplicated prose), keep a space.
    const head = out.slice(0, cut)
    return head
  }
  return out
}

/**
 * Normalize math notation in a single text field. Safe to call on any prose
 * string; returns the input unchanged when there is nothing to fix.
 */
export function normalizeMathDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return text
  let out = convertParenMathToDelimiters(text)
  out = dedupeDisplayMath(out)
  return out
}

/** Marking-result shaped object whose prose fields should be normalized. */
type MarkLike = {
  reasoning?: unknown
  margin_note?: unknown
  [key: string]: unknown
}

type BandLike = {
  justification?: unknown
  band_descriptor?: unknown
  strengths?: unknown
  improvements?: unknown
  [key: string]: unknown
}

type MarkingResultLike = {
  summary?: unknown
  what_to_study_next?: unknown
  estimated_marks_explanation?: unknown
  weak_topics?: unknown
  marks_awarded?: unknown
  band_result?: unknown
  [key: string]: unknown
}

function normStr(v: unknown): unknown {
  return typeof v === 'string' ? normalizeMathDelimiters(v) : v
}

function normStrArray(v: unknown): unknown {
  return Array.isArray(v) ? v.map((item) => normStr(item)) : v
}

/**
 * Normalize all rendered prose fields of a parsed Claude marking result,
 * in place-safe fashion (mutates and returns the same object reference).
 *
 * Explicitly does NOT touch `line_reference` (examiner-ink positioning),
 * `syllabus_tags`, `mcq_breakdown`, score numbers, or classification codes.
 */
export function normalizeMarkingResult<T extends MarkingResultLike>(result: T): T {
  if (!result || typeof result !== 'object') return result

  result.summary = normStr(result.summary)
  result.what_to_study_next = normStr(result.what_to_study_next)
  result.estimated_marks_explanation = normStr(result.estimated_marks_explanation)
  result.weak_topics = normStrArray(result.weak_topics)

  if (Array.isArray(result.marks_awarded)) {
    for (const mark of result.marks_awarded as MarkLike[]) {
      if (!mark || typeof mark !== 'object') continue
      mark.reasoning = normStr(mark.reasoning)
      mark.margin_note = normStr(mark.margin_note)
      // NOTE: mark.line_reference is intentionally left untouched.
    }
  }

  if (result.band_result && typeof result.band_result === 'object') {
    const band = result.band_result as BandLike
    band.justification = normStr(band.justification)
    band.band_descriptor = normStr(band.band_descriptor)
    band.strengths = normStrArray(band.strengths)
    band.improvements = normStrArray(band.improvements)
  }

  return result
}
