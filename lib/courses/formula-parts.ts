import type { CourseLesson } from '@/lib/courses/types'
import type { FormulaPart } from '@/lib/courses/visual-types'
import { describeBusinessLabel, lookupBusinessTerm } from '@/lib/courses/business-variable-definitions'
import { lookupVariableDefinitionForLesson } from '@/lib/courses/variable-definitions'
import { repairMathDelimiters } from '@/lib/courses/math-format'

const PALETTE = [
  'var(--course-formula-green)',
  '#3b6fd9',
  '#c17f3a',
  '#7c5cbf',
  '#2d8a6e',
  '#b84a62',
]

export type ParsedFormula = {
  description: string
  latex: string
  expressions: string[]
  expression: string
  parts: FormulaPart[]
}

type KnownFormula = {
  test: RegExp
  latex: string | string[]
  symbols: string[]
}

const KNOWN: KnownFormula[] = [
  { test: /Q\s*=\s*mc\s*(?:\\Delta|\\?Δ)\s*T/i, latex: 'Q = mc\\Delta T', symbols: ['Q', 'm', 'c', 'ΔT'] },
  { test: /Q\s*=\s*mL\b/i, latex: 'Q = mL', symbols: ['Q', 'm', 'L'] },
  { test: /T\s*=\s*\\frac\s*\{\s*1\s*\}\s*\{\s*f\s*\}/i, latex: 'T = \\frac{1}{f}', symbols: ['T', 'f'] },
  { test: /v\s*=\s*f\s*\\lambda/i, latex: 'v = f\\lambda', symbols: ['v', 'f', 'λ'] },
  { test: /I\s*=\s*I_0\s*\\cos/i, latex: 'I = I_0\\cos^2\\theta', symbols: ['I', 'I₀', 'θ'] },
  { test: /I\s*=\s*Q\s*\/\s*t/i, latex: 'I = \\frac{Q}{t}', symbols: ['I', 'Q', 't'] },
  { test: /p\s*=\s*mv\b/i, latex: 'p = mv', symbols: ['p', 'm', 'v'] },
  {
    test: /E_k\s*=\s*\\frac\s*\{\s*1\s*\}\s*\{\s*2\s*\}mv/i,
    latex: 'E_k = \\frac{1}{2}mv^2',
    symbols: ['E_k', 'm', 'v'],
  },
  {
    test: /N\s*=\s*kg\s*m\s*s/i,
    latex: 'N = kg m s^{-2}',
    symbols: ['N', 'kg', 'm', 's'],
  },
  {
    test: /F_\{net\}\s*=\s*ma/i,
    latex: ['F_{net} = ma', 'F_{net} = \\frac{\\Delta p}{\\Delta t}'],
    symbols: ['F_net', 'm', 'a', 'Δp', 'Δt'],
  },
  {
    test: /F\s*=\s*\\frac\s*\{\s*\\Delta\s*p\s*\}\s*\{\s*\\Delta\s*t\s*\}/i,
    latex: 'F = \\frac{\\Delta p}{\\Delta t}',
    symbols: ['F', 'Δp', 'Δt'],
  },
  { test: /F\s*=\s*ma\b/i, latex: 'F = ma', symbols: ['F', 'm', 'a'] },
  { test: /K\s*=\s*C\s*\+\s*273/i, latex: 'K = C + 273.15', symbols: ['K', 'C'] },
  { test: /V\s*=\s*IR\b/i, latex: 'V = IR', symbols: ['V', 'I', 'R'] },
  { test: /P\s*=\s*VI\b/i, latex: 'P = VI', symbols: ['P', 'V', 'I'] },
  { test: /p_f\s*=\s*p_i/i, latex: 'p_f = p_i', symbols: ['p_f', 'p_i'] },
  {
    test: /\\text\{Fixed costs\}.*\\text\{Contribution/i,
    latex: 'BE = \\frac{FC}{C}',
    symbols: ['FC', 'C'],
  },
  {
    test: /\\text\{Gross profit\}.*\\text\{Revenue\}/i,
    latex: 'GPM = \\frac{GP}{Rev}',
    symbols: ['GP', 'Rev'],
  },
  {
    test: /\\text\{PBIT\}.*\\text\{Capital employed\}/i,
    latex: 'ROCE = \\frac{PBIT}{CE}',
    symbols: ['PBIT', 'CE'],
  },
  {
    test: /\\text\{Current assets\}.*\\text\{Current liabilities\}/i,
    latex: 'CR = \\frac{CA}{CL}',
    symbols: ['CA', 'CL'],
  },
]

const DISPLAY_SYMBOLS: Record<string, string> = {
  '\u03bb': 'λ',
  '\u03b8': 'θ',
  '\u0394T': 'ΔT',
  '\u0394p': 'Δp',
  '\u0394t': 'Δt',
  '\u0394(mv)': 'Δ(mv)',
  'I\u2080': 'I₀',
  F_net: 'F_net',
}

function displaySymbol(sym: string): string {
  return DISPLAY_SYMBOLS[sym] ?? sym
}

/** Close odd $ delimiters from LLM-generated formula sections. */
export function repairFormulaDelimiters(content: string): string {
  return repairMathDelimiters(content)
}

/** Wrap a symbol for KaTeX when it contains LaTeX markers. */
export function formatSymbolForMath(symbol: string): string {
  const s = symbol.trim()
  if (!s || s.includes('$')) return s

  if (/\\|[_{^]/.test(s)) {
    const fixed = s.replace(/([A-Za-z])_\\text\{([^}]+)\}/g, '$1_{\\text{$2}}')
    return `$${fixed}$`
  }

  return s
}

/** Wrap bare LaTeX as a single inline math expression for CourseRichText. */
export function wrapFormulaExpression(latex: string): string {
  const inner = latex.trim().replace(/^\$+|\$+$/g, '')
  if (!inner) return ''
  return `$${inner}$`
}

/** Strip HTML tags and normalize breaks to newlines. */
export function sanitizeFormulaInput(content: string): string {
  return repairFormulaDelimiters(
    content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim()
  )
}

/** Extract one or more LaTeX equations from mashed content. */
export function extractLatexEquations(content: string): string[] {
  const s = sanitizeFormulaInput(content)
  const equations: string[] = []

  for (const m of s.matchAll(/\$\$([^$]+)\$\$/g)) {
    equations.push(m[1].trim())
  }
  if (equations.length) return equations

  for (const segment of s.split(/\n+/)) {
    const t = segment.trim()
    if (!t) continue

    const labelMatch = t.match(/^([^:$\n]+):\s*(.+)$/)
    if (labelMatch && /[=\\]|\\frac|\\text|[_^]/.test(labelMatch[2]!)) {
      const labelled = extractLatexEquations(labelMatch[2]!)
      if (labelled.length) {
        equations.push(...labelled)
        continue
      }
    }

    const inlines = [...t.matchAll(/\$([^$]+)\$/g)]
    if (inlines.length) {
      for (const m of inlines) equations.push(m[1].trim())
    } else if (/=/.test(t)) {
      equations.push(t.replace(/^\$+|\$+$/g, '').trim())
    }
  }
  if (equations.length) return equations

  const single = s.match(/\$([^$]+)\$/)
  if (single) return [single[1].trim()]

  if (/=/.test(s)) return [s.replace(/^\$+|\$+$/g, '').trim()]

  return []
}

/** Split mashed formula prose from LaTeX equation(s). */
export function splitFormulaContent(content: string): { description: string; latex: string } {
  const s = sanitizeFormulaInput(content)
  const lines = extractLatexEquations(content)
  const latex = lines[0] ?? ''

  const labelMatch = s.match(/^([^:$\n]+):\s*/)
  if (labelMatch && lines.length) {
    return { description: labelMatch[1].trim(), latex }
  }

  const stripped = s
    .replace(/\$\$[^$]+\$\$/g, ' ')
    .replace(/\$[^$]+\$/g, ' ')
    .replace(/:\s*$/, '')
    .trim()

  return { description: stripped, latex }
}

/** Extract variable symbols from LaTeX — both sides of =, composite tokens, subscripts. */
export function extractLatexSymbols(latex: string): string[] {
  if (!latex.trim()) return []

  const hay = sanitizeFormulaInput(latex).split(/\s+or\s+/i)[0].trim()
  const found: string[] = []
  const seen = new Set<string>()

  function add(sym: string) {
    const key = sym.trim()
    if (!key || seen.has(key) || /^br$/i.test(key) || /^text$/i.test(key)) return
    if (/^(normal|tangent)$/i.test(key)) return
    seen.add(key)
    found.push(key)
  }

  function splitImplicitMul(c: string): string {
    const vars = 'pfmvtcgaqi'
    let out = c
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([a-z])(?![a-z])/g, '$1 $2')
    for (let i = 0; i < 8; i++) {
      const next = out.replace(/([a-z])([a-z])/gi, (_, a: string, b: string) => {
        if (vars.includes(a.toLowerCase()) && vars.includes(b.toLowerCase())) return `${a} ${b}`
        return `${a}${b}`
      })
      if (next === out) break
      out = next
    }
    return out
  }

  function stripLatexSymbols(c: string): string {
    let out = c

    out = out.replace(/\\Delta\s*\(\s*mv\s*\)/gi, () => {
      add('Δ(mv)')
      return ' '
    })
    out = out.replace(/\\Delta\s*T\b/g, () => {
      add('ΔT')
      return ' '
    })
    out = out.replace(/\\Delta\s*\{([a-zA-Z])\}/g, (_, letter: string) => {
      add(`Δ${letter}`)
      return ' '
    })
    out = out.replace(/\\Delta\s*([a-zA-Z])(?![a-z])/g, (_, letter: string) => {
      add(`Δ${letter}`)
      return ' '
    })
    out = out.replace(/\\lambda/g, () => {
      add('λ')
      return ' '
    })
    out = out.replace(/\\theta/g, () => {
      add('θ')
      return ' '
    })

    return out
  }

  function tokenize(chunk: string) {
    let c = chunk

    while (/\\frac\{/.test(c)) {
      c = c.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/, (_, a: string, b: string) => {
        tokenize(a)
        tokenize(b)
        return ' '
      })
    }

    c = stripLatexSymbols(c)
    c = splitImplicitMul(c)

    for (const m of [...c.matchAll(/([A-Za-z])_\{\\text\{([^}]+)\}\}/g)]) {
      add(`${m[1]}_${m[2]}`)
      c = c.replace(m[0], ' ')
    }

    for (const m of [...c.matchAll(/([A-Za-z])_\{([^}]+)\}/g)]) {
      add(`${m[1]}_${m[2]}`)
      c = c.replace(m[0], ' ')
    }

    for (const m of [...c.matchAll(/([A-Za-z])_\{?0\}?/g)]) {
      add(`${m[1]}₀`)
      c = c.replace(m[0], ' ')
    }
    for (const m of [...c.matchAll(/([A-Za-z])_([a-zA-Z0-9]+)/g)]) {
      add(`${m[1]}_${m[2]}`)
      c = c.replace(m[0], ' ')
    }

    c = c.replace(/\\(?:cos|sin|tan|log|ln|sqrt|text|mathrm)[^a-zA-Z]*/gi, ' ')
    c = c.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')

    for (const token of c.match(/[A-Za-z]+|λ|θ|ΔT|Δθ|Δ\([a-z]+\)|Δ[a-z]|I₀/g) ?? []) {
      if (token.length === 1 && /^[a-z]$/.test(token) && !'pfmvtcgaqi'.includes(token)) continue
      add(token)
    }
  }

  for (const side of hay.split('=')) {
    tokenize(side)
  }

  return found.slice(0, 10)
}

function partsFromSymbols(
  symbols: string[],
  topicCode?: string,
  subjectCode?: string
): FormulaPart[] {
  return symbols.map((sym, i) => ({
    symbol: displaySymbol(sym),
    meaning: lookupVariableDefinitionForLesson(sym, topicCode, subjectCode),
    color: PALETTE[i % PALETTE.length],
  }))
}

/** Extract \text{…} labels, abbreviations, and bold terms from formula prose. */
export function extractTextLabelParts(content: string, subjectCode?: string): FormulaPart[] {
  const parts: FormulaPart[] = []
  const seen = new Set<string>()

  const add = (label: string) => {
    const display = label.trim()
    if (!display || display.length > 52) return
    const key = display.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const meaning =
      lookupBusinessTerm(display, subjectCode) ??
      lookupVariableDefinitionForLesson(display, undefined, subjectCode)
    parts.push({
      symbol: display.length > 22 ? `${display.slice(0, 19)}…` : display,
      meaning: meaning === 'Definition coming soon' ? describeBusinessLabel(display) : meaning,
      color: PALETTE[parts.length % PALETTE.length],
    })
  }

  for (const m of content.matchAll(/\\text\{([^}]+)\}/g)) {
    add(m[1]!)
  }

  for (const m of content.matchAll(
    /\b(FC|VC|SP|TR|TC|NPV|ARR|ROCE|GP|GPM|OPM|CE|COGS|PED|YED|XED|MoS|BEP|NP|PBIT|AC|AFC|AVC|CA|CL)\b/g
  )) {
    add(m[1]!)
  }

  for (const m of content.matchAll(/\*\*([^*]{2,40})\*\*/g)) {
    add(m[1]!)
  }

  return parts.slice(0, 12)
}

function mergeFormulaParts(primary: FormulaPart[], secondary: FormulaPart[]): FormulaPart[] {
  const out = [...primary]
  const seen = new Set(primary.map((p) => p.symbol.toLowerCase()))
  for (const part of secondary) {
    const key = part.symbol.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...part, color: PALETTE[out.length % PALETTE.length] })
  }
  return out.slice(0, 12)
}

function symbolsFromLines(lines: string[]): string[] {
  const all: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    for (const sym of extractLatexSymbols(line)) {
      if (!seen.has(sym)) {
        seen.add(sym)
        all.push(sym)
      }
    }
  }
  return all
}

export function parseFormulaParts(
  content: string,
  _lesson?: CourseLesson,
  subjectCode?: string
): ParsedFormula {
  const topicCode = _lesson?.topicCode
  const { description } = splitFormulaContent(content)
  const latexLines = extractLatexEquations(content)
  const hay = latexLines.join(' ')
  const textParts = extractTextLabelParts(content, subjectCode)

  for (const known of KNOWN) {
    if (known.test.test(hay)) {
      const lines = Array.isArray(known.latex) ? known.latex : [known.latex]
      const expressions = lines.map((l) => wrapFormulaExpression(l))
      const symbolParts = partsFromSymbols(known.symbols, topicCode, subjectCode)
      return {
        description,
        latex: lines.join('\n'),
        expressions,
        expression: expressions[0],
        parts: mergeFormulaParts(textParts, symbolParts),
      }
    }
  }

  const symbols = symbolsFromLines(latexLines)
  const parts = mergeFormulaParts(textParts, partsFromSymbols(symbols, topicCode, subjectCode))

  if (!parts.length) {
    parts.push({
      symbol: '∑',
      meaning: 'Key relationship for this topic',
      color: PALETTE[0],
    })
  }

  const displayLines = latexLines.length > 0 ? latexLines : []
  const expressions = displayLines.map((l) => wrapFormulaExpression(l))

  return {
    description,
    latex: displayLines.join('\n'),
    expressions,
    expression: expressions[0] ?? '',
    parts,
  }
}
