/**
 * Claude marking text (especially Accounting) often mixes:
 * - Currency: $\\$152{,}000$ or $(166{,}600)$
 * - Real math: $11{,}900 \\times \\$40 = \\$476{,}000$
 * - Stray $ (e.g. "85 - x$") that swallow paragraphs into one math node
 * - Bare LaTeX (`x^2`, `\\frac{1}{2}`) with no `$` delimiters
 *
 * The renderer (RichTextRenderer) runs remark-math with
 * `singleDollarTextMath: true`, so every UNESCAPED `$...$` is treated as
 * inline KaTeX. This normalizer prepares the text so that:
 * - genuine math is preserved for KaTeX (after sanitize),
 * - bare math runs are wrapped,
 * - currency / non-math `$...$` is rendered as plain text,
 * - any stray/leftover `$` is escaped so it never opens math mode.
 */

import {
  promoteBareBeginEnvironments,
  promoteEnvironmentsToDisplay,
  sanitizeLatexFragment,
} from '@/lib/rich-text/sanitize-latex'
import { wrapBareMathRuns } from '@/lib/rich-text/wrap-bare-math'

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

  if (/\\[a-zA-Z]{2,}/.test(s)) return true
  if (/[=^_]/.test(s) && /[a-zA-Z]/.test(s)) return true

  const plain = s
    .replace(/\\\$/g, '')
    .replace(/\{,\}/g, ',')
    .replace(/[(),\s]/g, '')
  if (/^[\d.$]+$/.test(plain)) return false
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

/** Remove C0 control characters except tab/newline/carriage-return. */
export function stripControlChars(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

export function normalizeMarkingText(text: string): string {
  if (!text) return text
  text = stripControlChars(text)

  // Convert LaTeX-native delimiters + wrap bare runs BEFORE the currency
  // discriminator, so mixed output (`$\theta$` + bare `x^2`) both render.
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)
  text = wrapBareMathRuns(text)
  text = promoteBareBeginEnvironments(text)
  text = promoteEnvironmentsToDisplay(text)

  const stash: string[] = []
  const stashMath = (latex: string, display: boolean): string => {
    const safe = sanitizeLatexFragment(latex)
      .replace(/\\\$/g, '\\text{\\textdollar}')
      .replace(/\$/g, '\\text{\\textdollar}')
    stash.push(display ? `$$${safe}$$` : `$${safe}$`)
    return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`
  }

  let working = text

  working = working.replace(/\$\$([\s\S]+?)\$\$/g, (_full, inner: string) =>
    stashMath(inner, true)
  )

  working = working.replace(
    /(?<!\\)\$((?:\\.|[^$\n])+?)(?<!\\)\$/g,
    (_full, inner: string) =>
      isRealMath(inner) ? stashMath(inner, false) : formatPlainCurrency(inner)
  )

  working = working.replace(/(?<!\\)\$/g, '\\$')

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

/**
 * True when the string is examiner/prose narrative with embedded maths, not a
 * short OCR/math fragment. Whole-wrapping prose in `$...$` makes KaTeX drop
 * every space ("Youstatedthenature…").
 */
function isMarkingProse(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  // Two+ tokens with letters → examiner phrase ("Award M1 for x^2"), not a
  // lone OCR fragment like "= 240x^2". Whole-wrapping that in $…$ drops spaces.
  if (words.length >= 2 && /[a-zA-Z]{2,}/.test(text)) return true
  if (text.length > 100) return true
  if (/[.!?]/.test(text) && words.length >= 6) return true
  if (/,\s+[a-z]/.test(text) && words.length >= 8) return true
  return false
}

/** Wrap bare OCR/math snippets (e.g. "= 240x^2") for KaTeX when no $ delimiters. */
export function prepareMarkingSnippet(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if (
    /(?<!\\)\$/.test(trimmed) ||
    trimmed.includes('\\(') ||
    trimmed.includes('\\[') ||
    trimmed.includes('$$')
  ) {
    return normalizeMarkingText(trimmed)
  }

  // Prose with embedded algebra → wrap bare runs only; never the whole paragraph.
  if (isMarkingProse(trimmed)) {
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
