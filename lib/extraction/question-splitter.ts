import { MAX_QUESTION_NESTING_DEPTH } from './config'
import type { ParsedPaperMeta } from './paper-meta'

export type RawGeminiQuestion = {
  question_number: string
  parent_number?: string | null
  is_leaf?: boolean
  question_text: string
  marks?: number | null
  source_page_numbers?: number[]
  options?: Record<string, string>
  tables?: Array<{ id?: string; headers: string[]; rows: string[][] }>
  figure_refs?: string[]
}

export type SplitQuestion = {
  question_number: string
  question_path: string
  parent_question_number: string | null
  depth: number
  is_leaf: boolean
  question_text: string
  marks: number | null
  source_page_numbers: number[]
  options: Record<string, string> | null
  tables: Array<{ id?: string; headers: string[]; rows: string[][] }> | null
  figure_refs: string[]
}

const ROMAN_INNER_RE = /^(i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3})$/i
const SUB_PART_RE = /\(([a-z]+)\)/gi

/** Depth of "4(a)(i)" → 2; "12" → 0 */
export function questionNestingDepth(questionNumber: string): number {
  let depth = 0
  for (const match of questionNumber.matchAll(SUB_PART_RE)) {
    const inner = match[1]
    if (ROMAN_INNER_RE.test(inner) || /^[a-z]$/i.test(inner)) {
      depth++
    }
  }
  return depth
}

/** "4(a)(i)" → "4(a)"; "4(a)" → "4"; "12" → null */
export function parentQuestionNumber(questionNumber: string): string | null {
  const normalized = questionNumber.trim()
  const parts = [...normalized.matchAll(SUB_PART_RE)]
  if (parts.length === 0) return null
  const last = parts[parts.length - 1]
  const cutAt = last.index ?? normalized.lastIndexOf('(')
  const parent = normalized.slice(0, cutAt)
  return parent.length > 0 ? parent : null
}

/**
 * Sortable path for DB queries: 1(a)(i) → 01.a.i, 7(ii) → 07.ii, 4 → 04.
 * Faithful to Gemini question_number; dotted notation sorts globally (07.a < 07.b < 07.ii < 08).
 */
export function buildSortablePath(questionNumber: string): string {
  const normalized = questionNumber.trim()
  const topMatch = normalized.match(/^(\d+)/)
  if (!topMatch) return normalized.toLowerCase()

  const top = topMatch[1].padStart(2, '0')
  const parts = [...normalized.matchAll(SUB_PART_RE)].map((m) => m[1].toLowerCase())
  return parts.length === 0 ? top : `${top}.${parts.join('.')}`
}

/** Compare sortable paths for stable global ordering. */
export function compareQuestionPaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

/**
 * Detect top-level questions with direct roman children (no letter level), e.g. 7(ii).
 * Cambridge sometimes uses this; paths like 07.ii sort between 07.a and 08.
 */
export function detectRomanOnlySubparts(questions: SplitQuestion[]): string[] {
  const notes: string[] = []
  const byTop = new Map<string, SplitQuestion[]>()

  for (const q of questions) {
    const top = q.question_number.replace(/\(.*$/, '')
    if (!byTop.has(top)) byTop.set(top, [])
    byTop.get(top)!.push(q)
  }

  for (const [top, rows] of byTop) {
    const directRomans = rows.filter((q) => {
      const m = q.question_number.match(new RegExp(`^${top}\\(([ivx]+)\\)$`, 'i'))
      return Boolean(m)
    })
    if (directRomans.length > 0) {
      notes.push(
        `Q${top}: direct roman sub-parts without letter level (${directRomans.map((r) => r.question_number).join(', ')}) → paths ${directRomans.map((r) => r.question_path).join(', ')}`
      )
    }
  }

  return notes
}

/** @deprecated Use buildSortablePath — kept as alias. */
export function buildQuestionPath(questionNumber: string): string {
  return buildSortablePath(questionNumber)
}

function isEmptyText(text: string): boolean {
  return text.trim().length === 0
}

function directChildren(
  parentNumber: string,
  questions: SplitQuestion[]
): SplitQuestion[] {
  return questions.filter((q) => q.parent_question_number === parentNumber)
}

function promoteQuestionNumber(childNumber: string): string {
  const parent = parentQuestionNumber(childNumber)
  return parent ?? childNumber
}

function recomputeQuestionFields(q: SplitQuestion): SplitQuestion {
  return {
    ...q,
    parent_question_number: parentQuestionNumber(q.question_number),
    question_path: buildSortablePath(q.question_number),
    depth: questionNestingDepth(q.question_number),
  }
}

/**
 * Remove empty intermediate stubs; promote single-child rows one level up.
 */
export function collapseEmptyParentStubs(questions: SplitQuestion[]): {
  questions: SplitQuestion[]
  collapsed: string[]
} {
  const collapsed: string[] = []
  let current = questions.map(recomputeQuestionFields)

  let changed = true
  while (changed) {
    changed = false
    const remove = new Set<string>()
    const renumber = new Map<string, string>()

    // Deepest empty stubs first
    const empties = current
      .filter((q) => q.depth > 0 && isEmptyText(q.question_text))
      .sort((a, b) => b.depth - a.depth)

    for (const stub of empties) {
      if (remove.has(stub.question_number)) continue
      const children = directChildren(stub.question_number, current).filter(
        (c) => !remove.has(c.question_number)
      )

      if (children.length === 0) {
        remove.add(stub.question_number)
        collapsed.push(stub.question_number)
        changed = true
        continue
      }

      if (children.length === 1) {
        const child = children[0]
        const promoted = promoteQuestionNumber(child.question_number)
        remove.add(stub.question_number)
        renumber.set(child.question_number, promoted)
        collapsed.push(stub.question_number)
        changed = true
        continue
      }

      // Multiple children: drop empty parent row only
      remove.add(stub.question_number)
      collapsed.push(stub.question_number)
      changed = true
    }

    if (!changed) break

    current = current
      .filter((q) => !remove.has(q.question_number))
      .map((q) => {
        const newNumber = renumber.get(q.question_number) ?? q.question_number
        return recomputeQuestionFields({ ...q, question_number: newNumber })
      })
  }

  return { questions: current, collapsed }
}

function formatMcqOptions(options: Record<string, string>): string {
  const rows = ['A', 'B', 'C', 'D']
    .filter((k) => options[k])
    .map((k) => `| ${k} | ${options[k]} |`)
  if (rows.length === 0) return ''
  return `\n\n| Option | Text |\n|--------|------|\n${rows.join('\n')}`
}

function formatTables(
  tables: Array<{ id?: string; headers: string[]; rows: string[][] }>
): string {
  return tables
    .map((table) => {
      const headers = table.headers ?? []
      const sep = headers.map(() => '---').join(' | ')
      const headerRow = `| ${headers.join(' | ')} |`
      const dataRows = (table.rows ?? []).map((row) => `| ${row.join(' | ')} |`).join('\n')
      return `\n\n${headerRow}\n| ${sep} |\n${dataRows}`
    })
    .join('')
}

function normalizeQuestionText(q: RawGeminiQuestion, meta: ParsedPaperMeta): string {
  let text = String(q.question_text ?? '').trim()
  if (meta.paperKind === 'mcq' && q.options) {
    text += formatMcqOptions(q.options)
  }
  if (q.tables && q.tables.length > 0) {
    text += formatTables(q.tables)
  }
  return text
}

function parseMarks(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Normalize Gemini output into flat SplitQuestion rows with paths and parent links.
 */
export function splitQuestions(
  raw: RawGeminiQuestion[],
  meta: ParsedPaperMeta
): { questions: SplitQuestion[]; issues: string[] } {
  const issues: string[] = []
  const questions: SplitQuestion[] = []

  for (const q of raw) {
    const question_number = String(q.question_number ?? '').trim()
    if (!question_number) {
      issues.push('Skipped row with empty question_number')
      continue
    }

    const depth = questionNestingDepth(question_number)
    if (depth > MAX_QUESTION_NESTING_DEPTH) {
      issues.push(`Dropped ${question_number}: nesting depth ${depth} exceeds max ${MAX_QUESTION_NESTING_DEPTH}`)
      continue
    }

    const parent =
      q.parent_number?.trim() ||
      parentQuestionNumber(question_number)

    const is_leaf =
      q.is_leaf ??
      (meta.paperKind === 'mcq' ? true : parseMarks(q.marks) !== null)

    let marks = is_leaf ? parseMarks(q.marks) : null
    if (meta.paperKind === 'mcq' && is_leaf && marks === null) {
      marks = 1
    }

    questions.push({
      question_number,
      question_path: buildSortablePath(question_number),
      parent_question_number: parent,
      depth,
      is_leaf,
      question_text: normalizeQuestionText(q, meta),
      marks,
      source_page_numbers: Array.isArray(q.source_page_numbers)
        ? q.source_page_numbers.filter((p) => Number.isFinite(p))
        : [],
      options: q.options ?? null,
      tables: q.tables ?? null,
      figure_refs: Array.isArray(q.figure_refs) ? q.figure_refs : [],
    })
  }

  questions.sort((a, b) => compareQuestionPaths(a.question_path, b.question_path))

  const { questions: collapsed, collapsed: removed } = collapseEmptyParentStubs(questions)
  if (removed.length > 0) {
    issues.push(`Collapsed empty parent stubs: ${removed.join(', ')}`)
  }

  const romanNotes = detectRomanOnlySubparts(collapsed)
  issues.push(...romanNotes)

  return { questions: collapsed, issues }
}

export function formatManualReviewMessage(
  flagged: Array<{ question_number: string; reasons: string[] }>
): string | null {
  if (flagged.length === 0) return null
  const lines = flagged.map(
    (f) => `${f.question_number}: ${f.reasons.join('; ')}`
  )
  return `Manual review required (${flagged.length} questions):\n${lines.join('\n')}`
}
