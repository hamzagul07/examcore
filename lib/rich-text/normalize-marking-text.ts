/**
 * Claude marking text (especially Accounting) often mixes:
 * - Currency: $\\$152{,}000$ or $(166{,}600)$
 * - Real math: $11{,}900 \\times \\$40 = \\$476{,}000$
 * - Stray $ (e.g. "85 - x$") that swallow paragraphs into one math node
 *
 * The renderer (RichTextRenderer) runs remark-math with
 * `singleDollarTextMath: true`, so every UNESCAPED `$...$` is treated as
 * inline KaTeX. This normalizer prepares the text so that:
 * - genuine math (inline `$...$` / `\\(...\\)`, block `$$...$$`) is preserved
 *   verbatim for KaTeX, even when it embeds escaped currency like `\\$40`,
 * - currency / non-math `$...$` is rendered as plain text,
 * - any stray/leftover `$` is escaped (`\\$`) so it never opens math mode.
 *
 * Matching is escape-aware: an inner `\\$` is a literal dollar, not a math
 * delimiter, so `$\\$152{,}000$` and `$... \\$40 ... \\$476{,}000$` parse
 * correctly instead of breaking at the first embedded `$`.
 */

/** True when the delimiter contents are genuine math (vs currency/numbers). */
export function isRealMath(inner: string): boolean {
  const s = inner.trim()
  if (!s) return false

  if (
    /\\times|\\frac|\\cdot|\\div|\\sqrt|\\text|\\leq|\\geq|\\neq|\\pm|\\sum|\\int/.test(
      s
    )
  ) {
    return true
  }

  // Algebraic: letter + ^ or _ or = with letters
  if (/[=^_]/.test(s) && /[a-zA-Z]/.test(s)) return true

  // Pure currency / numeric (optional \$ prefix, {,} grouping)
  const plain = s
    .replace(/\\\$/g, '')
    .replace(/\{,\}/g, ',')
    .replace(/[(),\s]/g, '')
  if (/^[\d.$]+$/.test(plain)) return false

  // Only escaped dollars and digits
  if (/^(\\?\$)*[\d\s{},().]+$/.test(s)) return false

  return false
}

/** Turn a non-math $...$ / \( \) interior into readable plain text. */
export function formatPlainCurrency(inner: string): string {
  return inner
    .replace(/\\+\$/g, '$')
    .replace(/\\times/g, '×')
    .replace(/\{,\}/g, ',')
    .trim()
}

const STASH_OPEN = '\x00'
const STASH_CLOSE = '\x01'

export function normalizeMarkingText(text: string): string {
  if (!text) return text

  const stash: string[] = []
  const stashMath = (latex: string, display: boolean): string => {
    // A literal `$` inside a `$...$` span would prematurely close it in
    // remark-math (it ignores the backslash escape). Render embedded currency
    // dollars via KaTeX's `\textdollar`, which needs no `$` character.
    const safe = latex.replace(/\\\$/g, '\\textdollar ').replace(/\$/g, '\\textdollar ')
    stash.push(display ? `$$${safe}$$` : `$${safe}$`)
    return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`
  }

  let working = text

  // 1. Block math `$$...$$` — stash verbatim for KaTeX.
  working = working.replace(/\$\$([\s\S]+?)\$\$/g, (_full, inner: string) =>
    stashMath(inner, true)
  )

  // 2. Inline math `$...$`, escape-aware: an inner `\$` is a literal dollar.
  //    Opening/closing `$` must not be escaped.
  working = working.replace(
    /(?<!\\)\$((?:\\.|[^$\n])+?)(?<!\\)\$/g,
    (_full, inner: string) =>
      isRealMath(inner) ? stashMath(inner, false) : formatPlainCurrency(inner)
  )

  // 3. Inline math written as `\(...\)` (Claude sometimes emits this directly).
  working = working.replace(/\\\(([\s\S]*?)\\\)/g, (full, inner: string) =>
    isRealMath(inner) ? stashMath(inner, false) : formatPlainCurrency(inner)
  )

  // 4. Escape every remaining unescaped `$` (currency / stray) so remark-math
  //    never opens math mode on them.
  working = working.replace(/(?<!\\)\$/g, '\\$')

  // 5. Restore stashed real math verbatim (its `$` delimiters stay unescaped).
  working = working.replace(
    new RegExp(`${STASH_OPEN}(\\d+)${STASH_CLOSE}`, 'g'),
    (_m, i: string) => stash[parseInt(i, 10)]
  )

  return working
}
