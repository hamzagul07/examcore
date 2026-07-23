import { normalizeMarkdownTables } from '@/lib/rich-text/normalize-marking-text'

/**
 * Wrap math in `$...$` for question text that arrives WITHOUT LaTeX delimiters
 * (Gemini PDF extraction / question-photo OCR produce plain `x^2`, `dy/dx`,
 * `\frac{1}{2}`). The result page renders question_text through RichTextRenderer
 * (remark-math + KaTeX), which only renders already-delimited math — so
 * undelimited math shows as raw text.
 *
 * The previous version wrapped each EXPONENT on its own, producing
 * `y = $x^3$ - 6$x^2$ + 9x + 1`: half the expression in KaTeX italics, half in
 * the body font, with mismatched spacing. And it left bare LaTeX commands
 * (`\frac{1}{2}`) as literal backslash text. Both are the "KaTeX on the
 * question" breakage students see.
 *
 * This version wraps a WHOLE mathematical run as one unit, so an equation
 * renders as one clean line, and catches bare LaTeX commands. Still
 * conservative: a run must carry a real math signal (a superscript, a LaTeX
 * command, or two atoms joined by an operator) before it is touched, because a
 * false positive that corrupts the question wording is worse than under-wrapping.
 */

const STASH = '\x00Q'

// 3+ letter tokens are prose, EXCEPT these genuine math functions.
const MATH_WORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'exp', 'lim', 'max',
  'min', 'det', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan', 'sqrt',
])

/**
 * One math "atom": a LaTeX command, a bracketed group (with optional power), a
 * number, or a variable (with optional sub/superscript). Ordered so the
 * greediest, most specific forms match first.
 */
const ATOM =
  String.raw`\\[a-zA-Z]+(?:\{[^{}]*\}|\^\{[^{}]*\}|_\{[^{}]*\})*` + // \frac{1}{2}, \sqrt{x}
  String.raw`|[A-Za-z]\([^()\n]*\)(?:\^(?:\{[^{}]*\}|\w))?` + // f(x), g(x+1)
  String.raw`|\d*\([^()\n]*\)(?:\^(?:\{[^{}]*\}|\w))?` + // (1 - 4x)^6, 3(x+1)
  // Coefficient + variable, so implicit multiplication like `6x^2` is ONE atom
  // (the coefficient is not a separate number that breaks the run). Tried
  // before the bare-number form below.
  String.raw`|\d*[A-Za-z](?:_(?:\{[^{}]*\}|\w))?(?:\^(?:\{[^{}]*\}|\w))?` + // x, 6x^2, a_n
  String.raw`|\d+(?:\.\d+)?` // standalone numbers

const OP = String.raw`[-+*/=<>≤≥≠]|\\(?:cdot|times|div|leq|geq|neq|pm)`

// A single atom strong enough to wrap ALONE: it carries a superscript, a LaTeX
// command, or a parenthesised power — unambiguous math even without an operator
// beside it. (A bare `f(5)` renders identically as text and is deliberately not
// here.) LaTeX may absorb up to three attached trailing letters (`\frac{1}{2}bh`),
// bounded so a space-separated word is never eaten.
const STRONG =
  String.raw`\\[a-zA-Z]+(?:\{[^{}]*\}|\^\{[^{}]*\}|_\{[^{}]*\})+[A-Za-z]{0,3}(?![A-Za-z])` +
  String.raw`|\d*\([^()\n]*\)\^(?:\{[^{}]*\}|\w)` + // (1 - 4x)^6
  String.raw`|\d*[A-Za-z]\^(?:\{[^{}]*\}|\w)` // x^2

// A run: atom, then one-or-more (operator, atom). Interior spacing is optional
// so `dy/dx` and `x = 3` both match. Placed BEFORE the strong-single form so a
// full equation wins over its first sub-term.
const RUN_OR_STRONG = new RegExp(
  String.raw`(?:${ATOM})(?:\s*(?:${OP})\s*(?:${ATOM}))+|${STRONG}`,
  'g'
)

/**
 * Decide whether a candidate match should be wrapped.
 *
 *  - Anything containing a LaTeX command (`\`) is unambiguously math — wrap it,
 *    even though the command name ("frac") looks like a word.
 *  - Otherwise it must (a) not be prose that merely contains an operator, so no
 *    3+ letter word other than a known function; AND (b) carry a real math
 *    signal — a superscript, an equals, a parenthesis, or a coefficient stuck
 *    to a variable (`6x`). This rejects "9 am - 5 pm" and "8 out of 10" while
 *    keeping "x = 3" and "3x^2 - 1".
 */
function shouldWrap(m: string): boolean {
  if (m.includes('\\')) return true
  const words = m.match(/[A-Za-z]{3,}/g) ?? []
  if (!words.every((w) => MATH_WORDS.has(w.toLowerCase()))) return false
  return /[\^=]|[0-9][A-Za-z]|\(/.test(m)
}

/**
 * Reject a match that straddles a word. The atoms match single, unanchored
 * letters, so a run can legitimately open on the last letter of a word and close
 * on the first letter of the next — `Distance = speed` yields the run `e = s`,
 * and wrapping it gives `Distanc$e = s$peed`, shattering both words. Genuine
 * equations are always bounded by whitespace, punctuation, or a string edge, so
 * a letter immediately before or after the match means we are inside prose, not
 * math. This also stops two adjacent same-letter runs from emitting `$$`
 * (`N2 + 3H2 = 2NH3` → two runs whose join reads as a display-math delimiter).
 */
function abutsWord(match: string, offset: number, full: string): boolean {
  const before = offset > 0 ? full[offset - 1] : ''
  const after = full[offset + match.length] ?? ''
  // A colon on either side means ratio or clock notation (`a:b = 2:3`, `3:30`),
  // not an equation — the OP set excludes `:`, so a run can end up bounded by
  // one. A letter means the match is straddling a prose word.
  return /[A-Za-z:]/.test(before) || /[A-Za-z:]/.test(after)
}

export function normalizeQuestionText(text: string): string {
  if (!text) return text

  const withTables = normalizeMarkdownTables(text)

  // Already delimited — trust it, only normalise tables.
  if (/\$[^$]+\$/.test(withTables)) return withTables

  const stashed: string[] = []
  const stash = (body: string): string => {
    stashed.push(`$${body}$`)
    return `${STASH}${stashed.length - 1}\x00`
  }

  let out = withTables

  // One pass: whole equation runs (subsuming the per-exponent case), plus
  // single atoms strong enough to stand alone. looksLikeMath rejects prose that
  // merely contains an operator; a strong single atom is always math.
  out = out.replace(RUN_OR_STRONG, (m: string, offset: number, full: string) =>
    !abutsWord(m, offset, full) && shouldWrap(m) ? stash(m.trim()) : m
  )

  // Restore.
  out = out.replace(
    new RegExp(`${STASH}(\\d+)\\x00`, 'g'),
    (_m, i: string) => stashed[parseInt(i, 10)]
  )

  return out
}
