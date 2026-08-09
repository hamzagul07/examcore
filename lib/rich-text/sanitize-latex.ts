/**
 * Deterministic KaTeX fixes shared by marking, courses, and MathText.
 * Prefer under-fixing prose over inventing math — these only rewrite
 * known-bad command shapes and unicode that KaTeX rejects.
 */

const DOUBLE_ESCAPED_CMDS =
  'begin|end|frac|dfrac|tfrac|binom|sqrt|text|mathrm|mathbf|operatorname|' +
  'left|right|cdot|times|div|pm|to|implies|rightarrow|Rightarrow|' +
  'theta|pi|alpha|beta|gamma|Delta|omega|mu|sigma|phi|infty|' +
  'sum|int|lim|sin|cos|tan|log|ln|leq|geq|neq|approx|partial|' +
  'vec|hat|bar|overline|underline|displaystyle|quad|qquad'

/** Collapse `\\frac` → `\frac` (over-escaped JSON) for known commands. */
export function fixDoubleEscapedLatexCommands(text: string): string {
  if (!text.includes('\\\\')) return text
  return text
    .replace(/\\\\(begin|end)\{/g, '\\$1{')
    .replace(new RegExp(`\\\\\\\\(${DOUBLE_ESCAPED_CMDS})\\b`, 'g'), '\\$1')
}

/**
 * Replace `\cmd{...}` with balanced braces (handles nesting unlike `[^{}]*`).
 */
export function replaceCommandWithBraces(
  text: string,
  cmd: string,
  replacer: (inner: string) => string
): string {
  const needle = `\\${cmd}{`
  let out = ''
  let i = 0
  while (i < text.length) {
    const at = text.indexOf(needle, i)
    if (at === -1) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, at)
    let j = at + needle.length
    let depth = 1
    while (j < text.length && depth > 0) {
      const ch = text[j]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      j++
    }
    if (depth === 0) {
      out += replacer(text.slice(at + needle.length, j - 1))
      i = j
    } else {
      out += text[at]
      i = at + 1
    }
  }
  return out
}

/** Remap / soften unsupported commands inside a single math fragment. */
export function sanitizeLatexFragment(latex: string): string {
  if (!latex) return latex
  let s = fixDoubleEscapedLatexCommands(latex)

  // Invisible / BOM chars break the KaTeX tokenizer.
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '')

  // Chemistry / unit packages KaTeX does not ship (balanced braces).
  s = replaceCommandWithBraces(s, 'ce', (inner) => `\\mathrm{${inner}}`)
  s = replaceCommandWithBraces(s, 'pu', (inner) => `\\text{${inner}}`)

  // Common LLM aliases that are not KaTeX built-ins.
  s = s.replace(/\\overbar\b/g, '\\overline')
  s = s.replace(/\\average\b/g, '\\operatorname{avg}')
  s = s.replace(/\\avg\b/g, '\\operatorname{avg}')
  s = s.replace(/\\nl\b/g, '\\\\')
  s = s.replace(/\\degree\b/g, '\\circ')
  s = s.replace(/\\degrees\b/g, '\\circ')

  // A double backslash before a command in a sub/sup (`^\\text`) is a row
  // break, which KaTeX rejects as a group. Collapse to a single backslash.
  s = s.replace(/([\^_])\\\\(?=[a-zA-Z])/g, '$1\\')

  // Unicode operators / greek that models emit outside LaTeX commands.
  s = s.replace(/×/g, '\\times ')
  s = s.replace(/÷/g, '\\div ')
  s = s.replace(/±/g, '\\pm ')
  s = s.replace(/·/g, '\\cdot ')
  s = s.replace(/π/g, '\\pi ')
  s = s.replace(/θ/g, '\\theta ')
  s = s.replace(/∞/g, '\\infty ')
  s = s.replace(/≤/g, '\\leq ')
  s = s.replace(/≥/g, '\\geq ')
  s = s.replace(/≠/g, '\\neq ')
  s = s.replace(/→/g, '\\to ')
  s = s.replace(/⇒/g, '\\Rightarrow ')
  s = s.replace(/≈/g, '\\approx ')
  s = s.replace(/√/g, '\\sqrt')

  // Unicode superscripts / subscripts → LaTeX.
  s = s.replace(/\u207B\u00B9/g, '^{-1}')
  s = s.replace(/\u207B\u00B2/g, '^{-2}')
  s = s.replace(/\u207B\u00B3/g, '^{-3}')
  s = s.replace(/⁻¹/g, '^{-1}')
  s = s.replace(/⁻²/g, '^{-2}')
  s = s.replace(/⁻³/g, '^{-3}')
  s = s.replace(/⁰/g, '^{0}')
  s = s.replace(/¹/g, '^{1}')
  s = s.replace(/²/g, '^{2}')
  s = s.replace(/³/g, '^{3}')
  s = s.replace(/⁴/g, '^{4}')
  s = s.replace(/⁵/g, '^{5}')
  s = s.replace(/₆/g, '_{6}')
  s = s.replace(/₇/g, '_{7}')
  s = s.replace(/₈/g, '_{8}')
  s = s.replace(/₉/g, '_{9}')
  s = s.replace(/₀/g, '_{0}')
  s = s.replace(/₁/g, '_{1}')
  s = s.replace(/₂/g, '_{2}')
  s = s.replace(/₃/g, '_{3}')
  s = s.replace(/₄/g, '_{4}')
  s = s.replace(/₅/g, '_{5}')

  // Percent and dashes.
  s = s.replace(/(?<!\\)%/g, '\\%')
  s = s.replace(/[–—]/g, '-')

  return s
}

/**
 * Walk `$...$` / `$$...$$` spans and sanitize their interiors.
 * Also undoubles escaped commands in non-math prose so wrapBare can see them.
 */
export function sanitizeMathDelimitersInText(text: string): string {
  if (!text) return text
  text = fixDoubleEscapedLatexCommands(text)
  let out = ''
  let i = 0
  const n = text.length

  while (i < n) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) {
        out += text.slice(i)
        break
      }
      out += `$$${sanitizeLatexFragment(text.slice(i + 2, end))}$$`
      i = end + 2
      continue
    }

    if (text[i] === '$' && text[i - 1] !== '\\') {
      let j = i + 1
      while (j < n && text[j] !== '\n') {
        if (text[j] === '$' && text[j - 1] !== '\\') break
        j++
      }
      if (j < n && text[j] === '$' && text[j + 1] !== '$') {
        out += `$${sanitizeLatexFragment(text.slice(i + 1, j))}$`
        i = j + 1
        continue
      }
    }

    out += text[i]
    i++
  }

  return out
}

/**
 * Promote single-`$` spans that contain multi-row environments to display
 * math so markdown does not mangle `\\` row breaks.
 */
export function promoteEnvironmentsToDisplay(text: string): string {
  if (!text) return text
  return text.replace(
    /(?<![$\\])\$(?!\$)([^$\n]*\\begin\{[a-zA-Z*]+\}[^$\n]*)\$(?!\$)/g,
    (_m, inner: string) => `$$${inner}$$`
  )
}

const STASH_BEGIN = '\x00B'

/**
 * Wrap bare `\begin{env}...\end{env}` (outside existing `$`) as display math.
 * Stops markdown from eating `\\` row breaks before KaTeX sees them.
 */
export function promoteBareBeginEnvironments(text: string): string {
  if (!text || !text.includes('\\begin{')) return text

  const stashed: string[] = []
  const protect = (m: string) => {
    stashed.push(m)
    return `${STASH_BEGIN}${stashed.length - 1}\x00`
  }

  let working = text.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, protect)

  working = working.replace(
    /\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g,
    (full) => {
      // Already display-shaped or tiny — leave alone if no row break / alignment.
      if (!/\\\\|&/.test(full) && full.length < 40) return full
      return `$$\n${full}\n$$`
    }
  )

  working = working.replace(
    new RegExp(`${STASH_BEGIN}(\\d+)\\x00`, 'g'),
    (_m, i: string) => stashed[parseInt(i, 10)]!
  )

  return working
}

/** Shared rehype-katex options — best-effort render, never red scream. */
export const KATEX_REHYPE_OPTIONS = {
  strict: 'ignore' as const,
  throwOnError: false,
  errorColor: 'var(--ec-text-secondary)',
  trust: false,
}
