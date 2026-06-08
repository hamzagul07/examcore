import { normalizeMarkdownTables } from '@/lib/rich-text/normalize-marking-text'

const STASH = '\x00C'

/** Detect raw LaTeX commands not yet inside $...$ */
const HAS_RAW_LATEX = /\\(?:frac|times|text|phi|sqrt|Delta|pm|div|cdot|theta|omega|alpha|beta|gamma|mu|pi|sigma|infty|left|right|vec|hat|bar|mathrm|mathbf)\b/

/**
 * Course lessons often store math as raw LaTeX (\times, \frac) without $ delimiters.
 * remark-math only renders delimited math — this wraps those segments for KaTeX.
 */
export function normalizeCourseText(text: string): string {
  if (!text) return text

  let s = normalizeMarkdownTables(text)
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

  return s
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

  // Equation-heavy line (starts with symbol / backslash)
  const trimmed = body.trim()
  if (HAS_RAW_LATEX.test(trimmed) && /^[A-Za-z_\\(\\-]/.test(trimmed) && !trimmed.startsWith('$')) {
    return prefix + wrapMath(trimmed)
  }

  // Inline fragments: 5.97 \times 10^{24}
  return (
    prefix +
    body.replace(
      /(\d[\d.]*\s*\\times\s*10\^\{?-?\d+\}?[\w\s\\^{}\-]*|\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})?[^.,;$\n]*)/g,
      (seg) => {
        if (!HAS_RAW_LATEX.test(seg) || seg.includes('$')) return seg
        return wrapMath(seg)
      }
    )
  )
}
