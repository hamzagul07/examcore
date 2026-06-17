import { normalizeMarkdownTables } from '@/lib/rich-text/normalize-marking-text'
import { repairMathDelimiters } from '@/lib/courses/math-format'

const STASH = '\x00C'

/** Detect raw LaTeX commands not yet inside $...$ */
const HAS_RAW_LATEX =
  /\\(?:frac|times|text|phi|sqrt|Delta|pm|div|cdot|theta|omega|alpha|beta|gamma|mu|pi|sigma|infty|left|right|vec|hat|bar|mathrm|mathbf|partial|limits|int|sum|log|ln|sin|cos|tan|Rightarrow|Leftrightarrow|rightarrow)\b/

/**
 * Course lessons often store math as raw LaTeX (\times, \frac) without $ delimiters.
 * remark-math only renders delimited math — this wraps those segments for KaTeX.
 */
export function normalizeCourseText(text: string): string {
  if (!text) return text

  let s = repairMathDelimiters(normalizeMarkdownTables(text))
  s = convertBacktickMath(s)
  s = s.replace(/\\_/g, '_')

  const stashed: string[] = []
  const protect = (m: string) => {
    stashed.push(m)
    return `${STASH}${stashed.length - 1}\x00`
  }

  s = s.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, protect)
  s = s.split('\n').map(wrapLatexLine).join('\n')
  s = s.replace(new RegExp(`${STASH}(\\d+)\\x00`, 'g'), (_, i) => stashed[parseInt(i, 10)]!)

  // Keep numbered steps in one <ol> (avoid blank lines resetting to "1.")
  s = s.replace(/\n\n+(?=\d+\.\s)/g, '\n')

  return repairMathDelimiters(s)
}

/** Course content often wraps math in backticks instead of $...$ */
function convertBacktickMath(text: string): string {
  return text.replace(/`([^`\n]+?)`/g, (_match, inner: string) => {
    const t = inner.trim()
    if (!t || t.includes('$')) return t
    const looksMath =
      /\\[a-zA-Z]/.test(t) ||
      /[=^_<>]|\\frac|\\int|\\ln|\\sum|e\^\{/.test(t) ||
      /^[A-Za-z](?:[₀-₉0-9_^]+)?$/.test(t)
    return looksMath ? `$${t}$` : t
  })
}

function splitTrailingPunctuation(s: string): { expr: string; suffix: string } {
  const m = s.match(/^(.+?)([.,;:!?]?)$/)
  return { expr: (m?.[1] ?? s).trim(), suffix: m?.[2] ?? '' }
}

function wrapMath(expr: string): string {
  const { expr: core, suffix } = splitTrailingPunctuation(expr.trim())
  if (!core) return expr
  return `$${core}$${suffix}`
}

function wrapMathFragment(fragment: string): string {
  const trimmed = fragment.trim()
  if (!trimmed || trimmed.includes('$') || !HAS_RAW_LATEX.test(trimmed)) return fragment
  return wrapMath(trimmed)
}

/** Prose sentences must not be wrapped as one math block — KaTeX collapses spaces. */
function isProseWithInlineMath(text: string): boolean {
  const t = text.trim()
  if (
    /^[A-Z][a-z]+\s+(that|the|a|an|how|if|when|where|why|what|calculate|find|show|determine|explain|derive|sketch|state|define|convert|prove)\b/i.test(
      t
    )
  ) {
    return true
  }
  return (t.match(/\b[a-z]{3,}\b/gi) ?? []).length >= 4
}

function replaceOutsideMath(body: string, replacer: (plain: string) => string): string {
  const parts = body.split(/(\$[^$\n]+?\$)/g)
  return parts.map((part, i) => (i % 2 === 1 ? part : replacer(part))).join('')
}

function wrapInlineEquations(body: string): string {
  let out = replaceOutsideMath(body, (plain) =>
    plain.replace(
      /\b([A-Za-z][A-Za-z0-9_]*\s*=\s*(?:\\[a-zA-Z][^,;.]*)+)/g,
      (match) => wrapMathFragment(match)
    )
  )

  out = replaceOutsideMath(out, (plain) =>
    plain.replace(
      /(\d[\d.]*\s*\\times\s*10\^\{?-?\d+\}?[\w\s\\^{}\-]*|\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})?[^.,;$\n]*)/g,
      (seg) => wrapMathFragment(seg)
    )
  )

  return out
}

function wrapLatexLine(line: string): string {
  if (!line.trim() || !HAS_RAW_LATEX.test(line)) return line

  const list = line.match(/^(\d+\.\s+)(.*)$/)
  const prefix = list?.[1] ?? ''
  let body = list ? list[2]! : line

  // Parentheses containing LaTeX: (M = 5.97 \times 10^{24} kg)
  body = body.replace(/\(([^)]*\\[a-zA-Z][^)]*)\)/g, (_, inner: string) => {
    if (inner.includes('$')) return `(${inner})`
    return `(${wrapMath(inner)})`
  })

  // Prose then equation after colon
  const colon = body.search(/:\s+(?=[^:]*\\[a-zA-Z])/)
  if (colon !== -1) {
    const prose = body.slice(0, colon + 1)
    const math = body.slice(colon + 1).trim()
    if (HAS_RAW_LATEX.test(math) && !math.startsWith('$')) {
      return prefix + prose + ' ' + wrapMath(math)
    }
  }

  const trimmed = body.trim()
  const isStandaloneEquation =
    HAS_RAW_LATEX.test(trimmed) &&
    !trimmed.startsWith('$') &&
    !isProseWithInlineMath(trimmed) &&
    /^(?:\\|[A-Za-z][A-Za-z0-9_]*\s*=)/.test(trimmed)

  if (isStandaloneEquation) {
    return prefix + wrapMath(trimmed)
  }

  return prefix + wrapInlineEquations(body)
}
