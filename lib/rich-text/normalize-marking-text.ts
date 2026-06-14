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

/** True when a line looks like a markdown/GFM table row (not a one-off pipe in prose). */
function isPipeTableRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.includes('|')) return false
  const cells = trimmed
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
  return cells.length >= 2
}

function isSeparatorRow(line: string): boolean {
  const t = line.trim()
  return t.includes('---') && /^\|?[\s|:\-]+\|?$/.test(t)
}

/** Ensure leading/trailing pipes for remark-gfm table parsing. */
function toGfmTableRow(line: string): string {
  const trimmed = line.trim()
  let cells = trimmed.split('|').map((c) => c.trim())
  if (cells[0] === '') cells = cells.slice(1)
  if (cells.length > 0 && cells[cells.length - 1] === '') {
    cells = cells.slice(0, -1)
  }
  if (cells.length === 0) return trimmed
  return `| ${cells.join(' | ')} |`
}

function separatorRow(columnCount: number): string {
  return `|${' --- |'.repeat(columnCount)}`
}

/**
 * Detect pipe-separated table rows missing the GFM header separator (---).
 * Inserts the separator and normalizes row delimiters so remark-gfm renders tables.
 */
export function normalizeMarkdownTables(text: string): string {
  if (!text) return text

  const lines = text.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    if (!isPipeTableRow(lines[i]) || isSeparatorRow(lines[i])) {
      out.push(lines[i])
      i += 1
      continue
    }

    const block: string[] = []
    while (
      i < lines.length &&
      isPipeTableRow(lines[i]) &&
      !isSeparatorRow(lines[i])
    ) {
      block.push(lines[i])
      i += 1
    }

    if (block.length >= 2) {
      const header = toGfmTableRow(block[0])
      const colCount = header.split('|').filter((c) => c.trim()).length
      out.push(header)
      out.push(separatorRow(colCount))
      for (let r = 1; r < block.length; r++) {
        out.push(toGfmTableRow(block[r]))
      }
    } else {
      for (const row of block) {
        out.push(row)
      }
    }
  }

  return out.join('\n')
}

/** Wrap bare OCR/math snippets (e.g. "= 240x^2") for KaTeX when no $ delimiters. */
export function prepareMarkingSnippet(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if (/(?<!\\)\$/.test(trimmed) || trimmed.includes('\\(') || trimmed.includes('$$')) {
    return normalizeMarkingText(trimmed)
  }

  const looksLikeMath =
    isRealMath(trimmed) ||
    (/^=/.test(trimmed) && /[a-zA-Z0-9^]/.test(trimmed)) ||
    (/[a-zA-Z]/.test(trimmed) && /[\^_=]/.test(trimmed))

  if (looksLikeMath) {
    return normalizeMarkingText(`$${trimmed}$`)
  }

  return normalizeMarkingText(trimmed)
}
