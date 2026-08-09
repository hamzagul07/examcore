/**
 * Wrap undelimited math runs in `$...$` for remark-math / KaTeX.
 * Shared by question OCR text and Claude marking output.
 */

const STASH = '\x00Q'

const MATH_WORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'exp', 'lim', 'max',
  'min', 'det', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan', 'sqrt',
])

const ATOM =
  String.raw`\\[a-zA-Z]+(?:\{[^{}]*\}|\^\{[^{}]*\}|_\{[^{}]*\})*` +
  String.raw`|[A-Za-z]\([^()\n]*\)(?:\^(?:\{[^{}]*\}|\w))?` +
  String.raw`|\d*\([^()\n]*\)(?:\^(?:\{[^{}]*\}|\w))?` +
  String.raw`|\d*[A-Za-z](?:_(?:\{[^{}]*\}|\w))?(?:\^(?:\{[^{}]*\}|\w))?` +
  String.raw`|\d+(?:\.\d+)?`

const OP = String.raw`[-+*/=<>≤≥≠]|\\(?:cdot|times|div|leq|geq|neq|pm)`

const STRONG =
  String.raw`\\[a-zA-Z]+(?:\{[^{}]*\}|\^\{[^{}]*\}|_\{[^{}]*\})+[A-Za-z]{0,3}(?![A-Za-z])` +
  String.raw`|\d*\([^()\n]*\)\^(?:\{[^{}]*\}|\w)` +
  String.raw`|\d*[A-Za-z]\^(?:\{[^{}]*\}|\w)`

const RUN_OR_STRONG = new RegExp(
  String.raw`(?:${ATOM})(?:\s*(?:${OP})\s*(?:${ATOM}))+|${STRONG}`,
  'g'
)

function shouldWrap(m: string): boolean {
  if (m.includes('\\')) return true
  const words = m.match(/[A-Za-z]{3,}/g) ?? []
  if (!words.every((w) => MATH_WORDS.has(w.toLowerCase()))) return false
  return /[\^=]|[0-9][A-Za-z]|\(/.test(m)
}

function abutsWord(match: string, offset: number, full: string): boolean {
  const before = offset > 0 ? full[offset - 1] : ''
  const after = full[offset + match.length] ?? ''
  return /[A-Za-z:]/.test(before) || /[A-Za-z:]/.test(after)
}

/**
 * Wrap undelimited math runs. Existing `$...$` / `$$...$$` spans are protected
 * so mixed Claude output (`$\theta$` + bare `x^2`) still gets the bare parts.
 */
export function wrapBareMathRuns(text: string): string {
  if (!text) return text

  const stashed: string[] = []
  const stashExisting = (m: string): string => {
    stashed.push(m)
    return `${STASH}${stashed.length - 1}\x00`
  }
  const stashWrap = (body: string): string => {
    stashed.push(`$${body}$`)
    return `${STASH}${stashed.length - 1}\x00`
  }

  let out = text.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, stashExisting)

  out = out.replace(RUN_OR_STRONG, (m: string, offset: number, full: string) =>
    !abutsWord(m, offset, full) && shouldWrap(m) ? stashWrap(m.trim()) : m
  )

  out = out.replace(
    new RegExp(`${STASH}(\\d+)\\x00`, 'g'),
    (_m, i: string) => stashed[parseInt(i, 10)]!
  )

  return out
}
