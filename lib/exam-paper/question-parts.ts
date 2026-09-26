/**
 * The data side of "show the question the way the paper prints it".
 *
 * Cambridge question papers hang the question number in the margin, label
 * sub-parts (a), (b), (i), (ii) in their own column, and range the marks
 * right in square brackets on the last line of each part. Our database keys
 * questions the same way ("3(b)(i)") but stores each leaf's text flat, and a
 * typed or photographed question can arrive as one block with the labels and
 * marks still inline. These helpers turn either form into the printed
 * structure. Pure, unit-tested, no React.
 */

export type QuestionPart = {
  /** "(a)", "(ii)" — absent on a single-part stem. */
  label?: string
  /** Markdown/LaTeX body with any trailing mark bracket removed. */
  text: string
  /** Marks printed for this part, when the text stated them. */
  marks?: number
}

export type ParsedQuestionNumber = {
  /** The whole-question number, "3" in "3(b)(i)". Null when unreadable. */
  number: string | null
  /** Sub-part labels in order, e.g. ["b", "i"]. */
  parts: string[]
  /** Printed form, "3(b)(i)". */
  printed: string
}

const ROMAN = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)$/

/** "3(b)(i)", "3 (b)", "3b", "Q3(b)", "3.b.i" → the printed structure. */
export function parseQuestionNumber(raw: string | null | undefined): ParsedQuestionNumber {
  const trimmed = (raw ?? '').trim().replace(/^q(?:uestion)?\s*/i, '')
  if (!trimmed) return { number: null, parts: [], printed: '' }

  const m = trimmed.match(/^(\d{1,3})\s*(.*)$/)
  if (!m) return { number: null, parts: [], printed: trimmed }

  const number = m[1]
  const rest = m[2]
  const parts: string[] = []
  if (rest) {
    const bracketed = [...rest.matchAll(/\(([a-z]{1,3})\)/gi)].map((x) => x[1].toLowerCase())
    if (bracketed.length) {
      parts.push(...bracketed)
    } else {
      // "3b", "3bi", "3.b.i" — bare letters; split a trailing roman numeral off
      const bare = rest.replace(/[.\s]/g, '').toLowerCase()
      const bareMatch = bare.match(/^([a-z])((?:i{1,3}|iv|v|vi{0,3}|ix|x))?$/)
      if (bareMatch) {
        parts.push(bareMatch[1])
        if (bareMatch[2]) parts.push(bareMatch[2])
      }
    }
  }
  const printed = number + parts.map((p) => `(${p})`).join('')
  return { number, parts, printed }
}

/**
 * Take "[3]", "[3 marks]", "(3 marks)" or "[Total: 3]" off the END of a part.
 * Anything else stays: "[0, 2]" is an interval, not a mark.
 */
export function stripTrailingMarks(text: string): { text: string; marks?: number } {
  const src = text.replace(/\s+$/, '')
  const m = src.match(
    /(?:\s|^)(?:\[\s*(?:total\s*:?\s*)?(\d{1,2})\s*(?:marks?)?\s*\]|\(\s*(\d{1,2})\s*marks?\s*\))\s*$/i
  )
  if (!m) return { text: src }
  const marks = Number(m[1] ?? m[2])
  if (!Number.isFinite(marks) || marks <= 0) return { text: src }
  return { text: src.slice(0, m.index).replace(/\s+$/, ''), marks }
}

const PART_LABEL_AT_LINE_START = /(?:^|\n)[ \t]*(?:\*\*)?\(([a-z]{1,3})\)(?:\*\*)?[ \t]+/g

/**
 * Split a whole-question text into its printed parts.
 *
 * Only labels that open a line count — "(a)" inside "f(a) = 2" or a citation
 * mid-sentence is left alone. Text before the first label becomes the shared
 * stem (an unlabeled first part). A single-part question comes back as one
 * part with no label, so callers can render either shape without a branch.
 */
export function splitQuestionParts(text: string | null | undefined): QuestionPart[] {
  const src = (text ?? '').replace(/\r\n?/g, '\n').trim()
  if (!src) return []

  const hits = [...src.matchAll(PART_LABEL_AT_LINE_START)]
    .map((m) => ({ index: m.index ?? 0, full: m[0], label: m[1].toLowerCase() }))
    .filter((h) => /^[a-z]$/.test(h.label) || ROMAN.test(h.label))

  if (!hits.length) {
    const { text: body, marks } = stripTrailingMarks(src)
    return [marks ? { text: body, marks } : { text: body }]
  }

  const parts: QuestionPart[] = []
  const stem = src.slice(0, hits[0].index).trim()
  if (stem) {
    const { text: body, marks } = stripTrailingMarks(stem)
    parts.push(marks ? { text: body, marks } : { text: body })
  }
  hits.forEach((h, i) => {
    const start = h.index + h.full.length
    const end = i + 1 < hits.length ? hits[i + 1].index : src.length
    const { text: body, marks } = stripTrailingMarks(src.slice(start, end).trim())
    if (!body && !marks) return
    parts.push(marks ? { label: `(${h.label})`, text: body, marks } : { label: `(${h.label})`, text: body })
  })
  return parts
}

/** Sum of the per-part marks, or null when no part stated any. */
export function sumPartMarks(parts: readonly QuestionPart[]): number | null {
  let total = 0
  let any = false
  for (const p of parts) {
    if (typeof p.marks === 'number') {
      total += p.marks
      any = true
    }
  }
  return any ? total : null
}

type Series = { code: 'M/J' | 'O/N' | 'F/M'; label: string }

const SERIES: Record<string, Series> = {
  s: { code: 'M/J', label: 'May/June' },
  w: { code: 'O/N', label: 'October/November' },
  m: { code: 'F/M', label: 'February/March' },
}

/** "s23" | "May/June 2023" | "June 2023" | "October/November 2023" → {series, year}. */
export function parseSession(
  session: string | null | undefined
): { series: Series; year: number } | null {
  const s = (session ?? '').trim()
  if (!s) return null
  const compact = s.match(/^([smw])(\d{2})$/i)
  if (compact) {
    return { series: SERIES[compact[1].toLowerCase()], year: 2000 + Number(compact[2]) }
  }
  const long = s.match(/(\d{4})/)
  if (!long) return null
  const year = Number(long[1])
  const lower = s.toLowerCase()
  const series = /jun|may/.test(lower)
    ? SERIES.s
    : /nov|oct/.test(lower)
      ? SERIES.w
      : /mar|feb/.test(lower)
        ? SERIES.m
        : null
  return series ? { series, year } : null
}

/** "s23" → "May/June 2023", the way the paper's cover prints it. */
export function sessionCoverLabel(session: string | null | undefined): string | null {
  const parsed = parseSession(session)
  return parsed ? `${parsed.series.label} ${parsed.year}` : null
}

/**
 * The running-footer code every Cambridge page carries: "9702/22/M/J/23".
 * Null when either half is unreadable — a made-up code is worse than none.
 */
export function paperFooterCode(
  paperCode: string | null | undefined,
  session: string | null | undefined
): string | null {
  const code = (paperCode ?? '').trim()
  if (!/^\d{4}\/\d{1,2}$/.test(code)) return null
  const parsed = parseSession(session)
  if (!parsed) return null
  return `${code}/${parsed.series.code}/${String(parsed.year % 100).padStart(2, '0')}`
}
