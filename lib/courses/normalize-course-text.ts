import { normalizeMarkdownTables, stripControlChars } from '@/lib/rich-text/normalize-marking-text'
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

  let s = stripControlChars(normalizeMarkdownTables(text))
  // `\(...\)` / `\[...\]` → `$...$` / `$$...$$` before anything pairs the `$`s.
  s = convertLatexDelimiters(s)
  // A double backslash before a command (`^\\text`, `_\\mathrm`) is corrupt
  // source data — the `\\` is a row break, which KaTeX rejects as a sub/sup
  // argument. Collapse it back to a single backslash so the command applies.
  s = s.replace(/([\^_])\\\\(?=[a-zA-Z])/g, '$1\\')
  // A bare multi-row formula (starts with a LaTeX command, uses `\\` row breaks,
  // no `$` delimiters) must be DISPLAY math: markdown mangles `\\` inside single
  // `$…$`, and line-by-line wrapping below would fragment it. Promote the whole
  // block to `$$…$$` (KaTeX renders `\\` line breaks + `\text{$n$…}` in display).
  s = promoteBareMultiRowFormula(s)
  // Neutralise currency dollars ($120,000, prose between two amounts) so they
  // do not open KaTeX math mode and swallow the surrounding sentence.
  s = neutralizeCurrencyDollars(s)
  s = repairMathDelimiters(s)
  s = convertBacktickMath(s)
  s = s.replace(/\\_/g, '_')

  // Matrices / multi-row environments (pmatrix, bmatrix, cases, array, aligned…)
  // must be DISPLAY math: single-$ inline math breaks on the `\\` row separators
  // (markdown treats them as escapes), leaving the LaTeX raw. Promote any single-$
  // span containing a \begin{…} to $$…$$ so KaTeX renders it.
  s = s.replace(/(?<![$\\])\$(?!\$)([^$\n]*\\begin\{[a-zA-Z*]+\}[^$\n]*)\$(?!\$)/g, (_m, inner) => `$$${inner}$$`)

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

  return displayBlocksOnOwnLines(sanitizeCurrencyInMath(repairMathDelimiters(s)))
}

/**
 * remark-math only parses a `$$…$$` block whose CONTENT spans multiple lines
 * when the `$$` delimiters sit on their own lines; otherwise it splits the rows
 * into separate fragments (`\begin{array}` rows lose their environment). Move
 * the delimiters onto their own lines for any multi-line display block.
 */
function displayBlocksOnOwnLines(text: string): string {
  return text.replace(/\$\$([\s\S]*?)\$\$/g, (m, inner: string) =>
    inner.includes('\n') ? `$$\n${inner.replace(/^\n+|\n+$/g, '')}\n$$` : m
  )
}

/**
 * remark-math ignores the backslash escape, so a `\$` INSIDE a `$…$` / `$$…$$`
 * span closes it prematurely (`$\$90{,}000$` breaks). Accounting / financial
 * lessons embed currency this way. Rewrite `\$` inside math spans to
 * `\text{\textdollar}`, which renders the dollar glyph with no `$` character.
 * (`\$` OUTSIDE math is left alone — there it is a plain escaped dollar.)
 */
function sanitizeCurrencyInMath(text: string): string {
  const fixDollars = (inner: string) => inner.replace(/\\\$/g, '\\text{\\textdollar}')
  let out = ''
  let i = 0
  const n = text.length

  while (i < n) {
    // Display block `$$…$$`.
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) {
        out += text.slice(i)
        break
      }
      out += `$$${fixDollars(text.slice(i + 2, end))}$$`
      i = end + 2
      continue
    }

    // Inline span `$…$`. Find the intended close: the next `$` that is NOT an
    // escaped currency dollar (`\$`), mirroring the author's intent.
    if (text[i] === '$' && text[i - 1] !== '\\') {
      let j = i + 1
      while (j < n && text[j] !== '\n') {
        if (text[j] === '$' && text[j - 1] !== '\\') break
        j++
      }
      if (j < n && text[j] === '$') {
        out += `$${fixDollars(text.slice(i + 1, j))}$`
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
 * Promote a bare (undelimited) multi-row LaTeX formula to a `$$…$$` display
 * block. Only fires when the whole trimmed string starts with a `\command` and
 * contains a `\\` row break — i.e. it reads as a formula, not prose that merely
 * mentions one — so ordinary sentences are never wrapped.
 */
function promoteBareMultiRowFormula(text: string): string {
  const t = text.trim()
  if (!t || t.includes('$$')) return text
  if (!t.startsWith('\\')) return text
  if (!/\\\\(\[|\s|$)/.test(t)) return text
  if (!HAS_RAW_LATEX.test(t)) return text
  // An odd number of `$` means an unpaired bare currency dollar; promoting it
  // would leave a lone `$` inside the display block (breaks math mode).
  if ((t.match(/\$/g) ?? []).length % 2 === 1) return text
  // Trailing explanatory prose (bare lowercase words outside `\text{}`) means
  // this is a formula-plus-prose field, not a pure formula — don't wrap the
  // prose as math. Real multi-row formulas keep their words inside `\text{}`.
  if (!spanIsMath(t)) return text
  // Formulas may embed inline `$n$` inside `\text{}`. Promote only when every
  // such span is genuine math — a stray currency `$` would break display mode.
  const spans = t.match(/\$([^$\n]*)\$/g)
  if (spans && spans.some((sp) => !spanIsMath(sp.slice(1, -1)))) return text
  return `$$\n${t}\n$$`
}

/**
 * Convert LaTeX-native delimiters to remark-math delimiters:
 *   `\[ ... \]` → `$$ ... $$`   (display)
 *   `\( ... \)` → `$ ... $`      (inline)
 * Course authors (esp. Maths/Physics lessons) frequently emit these; remark-math
 * only understands `$`, so left unconverted they render as literal `\[` / `\(`.
 */
function convertLatexDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)
}

/**
 * Decide whether the interior of a `$...$` span is genuine math or currency /
 * prose. English words inside real math live inside `{...}` groups (subscripts,
 * `\text{}`) or are LaTeX commands; so after stripping brace groups and
 * commands, a bare 3+ letter LOWERCASE word signals prose — i.e. two currency
 * dollars (`$120,000 ... $20`) that wrongly paired around a sentence. Uppercase
 * / mixed-case clusters (variable names like `PED`, `YED`, `PDP`, chemical
 * symbols like `HCl`, `CH`) are math, not prose, so they must NOT disqualify.
 */
function spanIsMath(inner: string): boolean {
  let s = inner
  // Iteratively remove innermost brace groups (handles nesting).
  let prev: string
  do {
    prev = s
    s = s.replace(/\{[^{}]*\}/g, ' ')
  } while (s !== prev)
  s = s.replace(/\\[a-zA-Z]+/g, ' ') // strip commands (\frac, \text, \Delta…)
  return !/[a-z]{3,}/.test(s)
}

/**
 * Escape currency / prose `$` so remark-math never opens math mode on them.
 * Walks the string, preserving `$$...$$` blocks and genuine inline math spans
 * verbatim, and escaping the delimiters of any span that reads as currency.
 */
function neutralizeCurrencyDollars(text: string): string {
  let out = ''
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]

    // Preserve display blocks verbatim.
    if (ch === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) {
        out += text.slice(i)
        break
      }
      out += text.slice(i, end + 2)
      i = end + 2
      continue
    }

    if (ch === '$' && text[i - 1] !== '\\') {
      // Find the closing single `$` on the same line (inline math never wraps).
      // Escape-aware: an inner `\$` is escaped currency, not the closer — treat
      // it as content so `$… \$5$` pairs at the final `$`, not the middle one.
      let j = i + 1
      while (j < n && text[j] !== '\n') {
        if (text[j] === '$' && text[j - 1] !== '\\') break
        j++
      }
      // A `$$` reached here is a display opener, not our close — this `$` is a
      // stray currency dollar sitting before a display block. Escape it alone so
      // we never consume (and break) the `$$` block.
      if (j < n && text[j] === '$' && text[j + 1] !== '$') {
        const inner = text.slice(i + 1, j)
        if (spanIsMath(inner)) {
          out += text.slice(i, j + 1) // keep real math verbatim
        } else {
          out += `\\$${inner}\\$` // currency / prose — escape both delimiters
        }
        i = j + 1
        continue
      }
      // No inline close on this line. A `$` with an empty/blank remainder can
      // never be a valid opener (openers have content after them) — it is a
      // trailing stray, so escape it. Otherwise, if the remainder reads as math,
      // leave the `$` for repairMathDelimiters to close.
      let eol = i + 1
      while (eol < n && text[eol] !== '\n') eol++
      const rest = text.slice(i + 1, eol)
      out += rest.trim() && spanIsMath(rest) ? '$' : '\\$'
      i++
      continue
    }

    out += ch
    i++
  }

  return out
}

/** Course content often wraps math in backticks instead of $...$ */
function convertBacktickMath(text: string): string {
  return text.replace(/`([^`\n]+?)`/g, (_match, inner: string) => {
    const t = inner.trim()
    if (!t || t.includes('$')) return t
    // Code, not math: a leading `^`/`_` has no base (`^List` = Pascal pointer),
    // and a bare escape (`\n`, `\t`) is a literal, not a LaTeX command. Wrapping
    // either as `$…$` yields "Expected group after ^" / "Undefined \n".
    if (/^[\^_]/.test(t) || /^\\[a-z]$/.test(t)) return t
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

  // Whole line is a single bare equation (any English words live inside
  // `\text{}`/braces) — wrap it as ONE span. Without this, the paren-wrapping
  // and prose heuristics below fragment equations like
  // `\Delta H^\ominus = \sum \Delta H_f^\ominus(\text{products}) - ...`.
  if (!body.includes('$') && spanIsMath(body)) {
    return prefix + wrapMath(body.trim())
  }

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
