import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiRetryStats, resetGeminiRetryStats } from '@/lib/marking/gemini-retry'
import {
  extractMarkSchemeWithGemini,
  type RawMarkSchemeEntry,
  type RawMarkingPoint,
} from './gemini-mark-scheme-extractor'
import { expectedMarkTotal } from './mark-sum-validate'
import { normalizeQuestionNumber } from './normalize-question-number'
import { isPaper5SectionHeader, parsePaper5SectionHeader } from './paper5-section'
import {
  parseMarkSchemePath,
  questionPaperPathFromMarkScheme,
  type ParsedMarkSchemeMeta,
} from './paper-meta'

export type QuestionRef = {
  id: string
  question_number: string
  marks: number | null
  is_leaf: boolean
}

export type ParsedMarkPoint = {
  point_text: string
  marks_awarded: number
  point_order: number
  examiner_notes: string | null
  alternative_phrasings: string[] | null
  source_page_numbers: number[]
  is_subtotal: boolean
}

export type ParsedMarkSchemeEntry = {
  question_number: string
  normalized_number: string
  question_subtotal: number | null
  source_page_numbers: number[]
  marking_points: ParsedMarkPoint[]
  section_label?: string | null
  canonical_question_number?: string | null
}

export type LinkedMarkPoint = ParsedMarkPoint & {
  id: string
  question_id: string
  question_number: string
  source_pdf_path: string
  section_label?: string | null
}

export type LinkValidation = {
  coveragePass: boolean
  missingLeaves: string[]
  perQuestionPass: boolean
  perQuestionMismatches: Array<{
    question_number: string
    expected: number
    actual: number
  }>
  totalMarkSum: number
  expectedTotal: number | null
  totalMarkPass: boolean
  unmatchedMsHeaders: string[]
}

export type LinkMarkSchemeResult = {
  meta: ParsedMarkSchemeMeta
  entries: ParsedMarkSchemeEntry[]
  linked: LinkedMarkPoint[]
  validation: LinkValidation
  pageCount: number
  chunksProcessed: number
  singleShot: boolean
  paperTotalFromMs: number | null
  jobStatus: 'completed' | 'failed'
  errorMessage: string | null
}

const SUBTOTAL_TEXT_RE =
  /^\[?\s*total\s*:?\s*\d+|^question\s+total|^sub[\s-]?total/i

export function parseMarksAwarded(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim().toLowerCase()
  if (s === '½' || s === '1/2' || s === '0.5') return 0.5
  const bracket = s.match(/\[?\s*(\d+(?:\.\d+)?|½|1\/2)\s*\]?/)
  if (bracket) {
    const v = bracket[1]
    if (v === '½' || v === '1/2') return 0.5
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function isSubtotalPoint(point: RawMarkingPoint): boolean {
  if (point.is_subtotal) return true
  const text = String(point.point_text ?? '').trim()
  return SUBTOTAL_TEXT_RE.test(text)
}

function enrichExaminerFields(point: RawMarkingPoint): {
  examiner_notes: string | null
  alternative_phrasings: string[] | null
} {
  const notes: string[] = []
  const alts: string[] = [...(point.alternative_phrasings ?? [])]

  if (point.examiner_notes?.trim()) {
    notes.push(point.examiner_notes.trim())
  }

  const text = String(point.point_text ?? '')
  const codes = text.match(
    /\b(ecf|owtte|cao)\b|(?:^|\s)(?:allow|do not allow)\s+\[[^\]]+\]/gi
  )
  if (codes) {
    for (const c of codes) notes.push(c.trim())
  }

  const orParts = text.split(/\s+OR\s+|;/).map((s) => s.trim()).filter(Boolean)
  if (orParts.length > 1) {
    for (const p of orParts.slice(1)) {
      if (!alts.includes(p)) alts.push(p)
    }
  }

  return {
    examiner_notes: notes.length > 0 ? [...new Set(notes)].join('; ') : null,
    alternative_phrasings: alts.length > 0 ? [...new Set(alts)] : null,
  }
}

/**
 * When Gemini over-lists OR alternatives as separate B1 rows, merge extras into
 * alternative_phrasings and cap total to question_subtotal or QP leaf marks.
 */
export function reconcileMarksToCap(
  points: ParsedMarkPoint[],
  cap: number
): ParsedMarkPoint[] {
  const sum = points.reduce((s, p) => s + p.marks_awarded, 0)
  if (sum <= cap) return points

  const result: ParsedMarkPoint[] = []
  let running = 0

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (running >= cap) {
      if (result.length > 0) {
        const last = result[result.length - 1]
        last.alternative_phrasings = [...(last.alternative_phrasings ?? []), p.point_text]
      }
      continue
    }

    const space = cap - running
    if (p.marks_awarded <= space) {
      result.push({ ...p })
      running += p.marks_awarded
    } else {
      result.push({ ...p, marks_awarded: space })
      running = cap
      for (let j = i + 1; j < points.length; j++) {
        const last = result[result.length - 1]
        last.alternative_phrasings = [
          ...(last.alternative_phrasings ?? []),
          points[j].point_text,
        ]
      }
      break
    }
  }

  return result.map((p, idx) => ({ ...p, point_order: idx + 1 }))
}

/** Parse raw Gemini entries into awardable marking points (excludes sub-totals). */
export function parseMarkSchemeEntries(
  raw: RawMarkSchemeEntry[]
): ParsedMarkSchemeEntry[] {
  const parsed: ParsedMarkSchemeEntry[] = []

  for (const entry of raw) {
    const question_number = String(entry.question_number ?? '').trim()
    if (!question_number) continue

    const awardable: ParsedMarkPoint[] = []
    let order = 0

    for (const rawPoint of entry.marking_points ?? []) {
      if (isSubtotalPoint(rawPoint)) continue

      const marks = parseMarksAwarded(rawPoint.marks_awarded)
      if (marks == null || marks <= 0) continue

      const { examiner_notes, alternative_phrasings } = enrichExaminerFields(rawPoint)
      order++

      awardable.push({
        point_text: String(rawPoint.point_text ?? '').trim(),
        marks_awarded: marks,
        point_order: order,
        examiner_notes,
        alternative_phrasings,
        source_page_numbers: entry.source_page_numbers ?? [],
        is_subtotal: false,
      })
    }

    const subtotal =
      entry.question_subtotal != null
        ? parseMarksAwarded(entry.question_subtotal)
        : null

    let normalized_number = normalizeQuestionNumber(question_number)
    let section_label: string | null = null
    let canonical_question_number: string | null = null

    if (isPaper5SectionHeader(question_number)) {
      const section = parsePaper5SectionHeader(question_number)
      if (section) {
        normalized_number = normalizeQuestionNumber(section.baseQuestionNumber)
        section_label = section.sectionLabel
        canonical_question_number = section.canonicalQuestionNumber
      }
    }

    parsed.push({
      question_number,
      normalized_number,
      question_subtotal: subtotal,
      source_page_numbers: entry.source_page_numbers ?? [],
      marking_points: awardable,
      section_label,
      canonical_question_number,
    })
  }

  return parsed
}

function buildQuestionLookup(questions: QuestionRef[]): Map<string, QuestionRef> {
  const map = new Map<string, QuestionRef>()
  for (const q of questions) {
    map.set(normalizeQuestionNumber(q.question_number), q)
  }
  return map
}

export function linkMarkPointsToQuestions(
  entries: ParsedMarkSchemeEntry[],
  questions: QuestionRef[],
  sourcePdfPath: string
): { linked: LinkedMarkPoint[]; unmatchedMsHeaders: string[] } {
  const lookup = buildQuestionLookup(questions)
  const linked: LinkedMarkPoint[] = []
  const unmatchedMsHeaders: string[] = []

  for (const entry of entries) {
    if (entry.marking_points.length === 0) continue

    const question = lookup.get(entry.normalized_number)
    if (!question) {
      unmatchedMsHeaders.push(entry.question_number)
      continue
    }

    const cap = entry.question_subtotal ?? question.marks
    const points =
      cap != null
        ? reconcileMarksToCap(entry.marking_points, cap)
        : entry.marking_points

    for (const point of points) {
      linked.push({
        ...point,
        id: randomUUID(),
        question_id: question.id,
        question_number: question.question_number,
        source_pdf_path: sourcePdfPath,
        section_label: entry.section_label ?? null,
      })
    }
  }

  return { linked, unmatchedMsHeaders }
}

export function validateMarkSchemeLink(
  linked: LinkedMarkPoint[],
  questions: QuestionRef[],
  meta: ParsedMarkSchemeMeta,
  paperTotalFromMs: number | null
): LinkValidation {
  const leaves = questions.filter((q) => q.is_leaf)
  const pointsByQuestion = new Map<string, LinkedMarkPoint[]>()

  for (const p of linked) {
    const key = normalizeQuestionNumber(p.question_number)
    if (!pointsByQuestion.has(key)) pointsByQuestion.set(key, [])
    pointsByQuestion.get(key)!.push(p)
  }

  const missingLeaves: string[] = []
  for (const leaf of leaves) {
    const key = normalizeQuestionNumber(leaf.question_number)
    const pts = pointsByQuestion.get(key) ?? []
    if (pts.length === 0) missingLeaves.push(leaf.question_number)
  }

  const perQuestionMismatches: LinkValidation['perQuestionMismatches'] = []
  for (const leaf of leaves) {
    const key = normalizeQuestionNumber(leaf.question_number)
    const pts = pointsByQuestion.get(key) ?? []
    if (pts.length === 0 || leaf.marks == null) continue

    const actual = pts.reduce((s, p) => s + p.marks_awarded, 0)
    if (Math.abs(actual - leaf.marks) > 0.01) {
      perQuestionMismatches.push({
        question_number: leaf.question_number,
        expected: leaf.marks,
        actual,
      })
    }
  }

  const totalMarkSum = linked.reduce((s, p) => s + p.marks_awarded, 0)
  const expectedTotal =
    paperTotalFromMs ?? expectedMarkTotal(meta)

  const totalMarkPass =
    expectedTotal == null
      ? true
      : Math.abs(totalMarkSum - expectedTotal) <= 2

  return {
    coveragePass: missingLeaves.length === 0,
    missingLeaves,
    perQuestionPass: perQuestionMismatches.length === 0,
    perQuestionMismatches,
    totalMarkSum,
    expectedTotal,
    totalMarkPass,
    unmatchedMsHeaders: [],
  }
}

function formatLinkErrors(validation: LinkValidation, unmatched: string[]): string {
  const parts: string[] = []

  if (unmatched.length > 0) {
    parts.push(
      `Unmatched MS question headers (${unmatched.length}):\n${unmatched.join('\n')}`
    )
  }
  if (!validation.coveragePass) {
    parts.push(
      `Leaf questions missing mark points (${validation.missingLeaves.length}):\n${validation.missingLeaves.join('\n')}`
    )
  }
  if (!validation.perQuestionPass) {
    const lines = validation.perQuestionMismatches.map(
      (m) => `${m.question_number}: expected ${m.expected}, got ${m.actual}`
    )
    parts.push(`Per-question mark mismatches:\n${lines.join('\n')}`)
  }
  if (!validation.totalMarkPass && validation.expectedTotal != null) {
    parts.push(
      `Total mark sum ${validation.totalMarkSum} differs from expected ${validation.expectedTotal} by more than 2`
    )
  }

  return parts.join('\n\n')
}

export type LinkMarkSchemeOptions = {
  pdfBytes: ArrayBuffer
  sourcePdfPath: string
  questions: QuestionRef[]
}

export async function linkMarkScheme(
  opts: LinkMarkSchemeOptions
): Promise<LinkMarkSchemeResult> {
  const meta = parseMarkSchemePath(opts.sourcePdfPath)
  if (!meta) {
    throw new Error(`Unrecognized mark scheme path: ${opts.sourcePdfPath}`)
  }

  resetGeminiRetryStats()

  const pdfBytes = opts.pdfBytes.slice(0)
  const gemini = await extractMarkSchemeWithGemini(pdfBytes, meta)
  const entries = parseMarkSchemeEntries(gemini.entries)
  const { linked, unmatchedMsHeaders } = linkMarkPointsToQuestions(
    entries,
    opts.questions,
    opts.sourcePdfPath
  )

  const validation = validateMarkSchemeLink(
    linked,
    opts.questions,
    meta,
    gemini.paper_total
  )
  validation.unmatchedMsHeaders = unmatchedMsHeaders

  const retryStats = getGeminiRetryStats()
  const errorParts: string[] = []
  const linkErrors = formatLinkErrors(validation, unmatchedMsHeaders)
  if (linkErrors) errorParts.push(linkErrors)
  if (retryStats.totalRetries > 0) {
    errorParts.push(
      `Gemini API retries: ${retryStats.totalRetries} (last: ${retryStats.lastLabel ?? 'unknown'})`
    )
  }

  const jobStatus: 'completed' | 'failed' =
    !validation.totalMarkPass || unmatchedMsHeaders.length > 0 ? 'failed' : 'completed'

  return {
    meta,
    entries,
    linked,
    validation,
    pageCount: gemini.page_count,
    chunksProcessed: gemini.chunks_processed,
    singleShot: gemini.single_shot,
    paperTotalFromMs: gemini.paper_total,
    jobStatus,
    errorMessage: errorParts.length > 0 ? errorParts.join('\n\n') : null,
  }
}

/** Load question refs from Phase 2 extraction JSON export. */
export function loadQuestionsFromExport(
  exportData: {
    questions: Array<{
      id: string
      question_number: string
      marks: number | null
      is_leaf: boolean
    }>
  }
): QuestionRef[] {
  return exportData.questions.map((q) => ({
    id: q.id,
    question_number: q.question_number,
    marks: q.marks,
    is_leaf: q.is_leaf,
  }))
}

export function exportPathForQuestionPaper(qpPath: string): string {
  return qpPath.replace(/[/.]/g, '_') + '.json'
}

export function defaultQuestionsExportPath(msPath: string): string | null {
  const qpPath = questionPaperPathFromMarkScheme(msPath)
  if (!qpPath) return null
  return `scripts/extraction-output/${exportPathForQuestionPaper(qpPath)}`
}

export async function persistLinkedMarkPoints(
  supabase: SupabaseClient,
  linked: LinkedMarkPoint[]
): Promise<number> {
  if (linked.length === 0) return 0

  const rows = linked.map((p) => ({
    id: p.id,
    question_id: p.question_id,
    point_text: p.point_text,
    marks_awarded: p.marks_awarded,
    point_order: p.point_order,
    examiner_notes: p.examiner_notes,
    alternative_phrasings: p.alternative_phrasings,
    source_pdf_path: p.source_pdf_path,
    source_page_numbers: p.source_page_numbers,
    section_label: p.section_label ?? null,
  }))

  const { error } = await supabase.from('extracted_mark_points').insert(rows)
  if (error) throw new Error(`Failed to insert mark points: ${error.message}`)
  return rows.length
}
