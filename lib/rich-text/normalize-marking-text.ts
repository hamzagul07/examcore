/**
 * Claude marking text (especially Accounting) often mixes:
 * - Currency: $\\$152{,}000$ or $(166{,}600)$
 * - Real math: $11{,}900 \\times \\$40 = \\$476{,}000$
 * - Stray $ (e.g. "85 - x$") that swallow paragraphs into one math node
 *
 * remark-math with singleDollarTextMath treats every $...$ as KaTeX, which
 * produces italic squashed prose. We normalize before render.
 */

const BLOCK_STASH = '\x00BLK'
const INLINE_STASH = '\x00INL'

/** LaTeX with operators/commands — render with KaTeX via \( \). */
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

function stashBlockMath(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = []
  const out = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    blocks.push(m)
    return `${BLOCK_STASH}${blocks.length - 1}\x00`
  })
  return { text: out, blocks }
}

function restoreBlockMath(text: string, blocks: string[]): string {
  return text.replace(
    new RegExp(`${BLOCK_STASH}(\\d+)\\x00`, 'g'),
    (_, i) => `$$${blocks[parseInt(i, 10)]}$$`
  )
}

function convertDollarPairs(text: string): string {
  return text.replace(/\$([^$\n]+?)\$/g, (full, inner: string) => {
    if (isRealMath(inner)) {
      return `\\(${inner}\\)`
    }
    return formatPlainCurrency(inner)
  })
}

function normalizeParenMath(text: string): string {
  return text.replace(/\\\(([\s\S]*?)\\\)/g, (full, inner: string) => {
    if (isRealMath(inner)) return full
    return formatPlainCurrency(inner)
  })
}

/** Escape $ not part of $$ blocks so remark-math never opens math mode on them. */
function escapeRemainingDollars(text: string): string {
  const parts = text.split(/\$\$/)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(/\$/g, '\\$')
    })
    .join('$$')
}

export function normalizeMarkingText(text: string): string {
  if (!text) return text

  let { text: working, blocks } = stashBlockMath(text)
  working = convertDollarPairs(working)
  working = restoreBlockMath(working, blocks)
  working = normalizeParenMath(working)
  working = escapeRemainingDollars(working)

  return working
}
