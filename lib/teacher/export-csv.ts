/**
 * CSV exports of a class (GET /api/teacher/classroom/[id]/export,
 * docs/TEACHER_SYSTEM_SPEC.md §3 and §8).
 *
 * The rules the route relies on, all enforced here so they are tested:
 *
 *   - Names are displayName() only ("Amira K."), never the full name and never
 *     an email: the file leaves the platform, lands in shared drives and gets
 *     emailed to heads of department. Two students who would print the same
 *     are told apart as "Amira K. (2)", numbered in the order they joined, so
 *     the numbering is stable between exports.
 *   - Only the students passed in appear — the route passes active members,
 *     so a student who left or was removed is not in the markbook.
 *   - Every cell is escaped for RFC 4180 and neutralised against formula
 *     injection: a student can name themselves `=HYPERLINK(…)`, and a teacher
 *     opening the export in Excel must not run it.
 *
 * Pure, no I/O: the route loads rows and hands them over.
 */

import { displayName } from '@/lib/teacher/display-name'
import { deriveStudentState, effectiveDueAt, HANDED_IN_STATES } from '@/lib/teacher/assignment-status'
import type {
  Assignment,
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  StudentAssignmentState,
} from '@/lib/teacher/types'

export type ExportScope = 'assignments' | 'attempts'

export function parseExportScope(raw: string | null): ExportScope | null {
  if (raw === null || raw === '' || raw === 'assignments') return 'assignments'
  if (raw === 'attempts') return 'attempts'
  return null
}

/** Hard ceiling on data rows in one file; the route says so when it is hit. */
export const MAX_EXPORT_ROWS = 20_000

// ---------------------------------------------------------------------------
// Cells and files
// ---------------------------------------------------------------------------

// A spreadsheet treats a cell starting with one of these as a formula (tab and
// CR too, which some parsers strip before looking).
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * One CSV cell. Numbers and booleans are written as-is (a negative number is
 * data, not a formula); strings that could start a formula are prefixed with
 * an apostrophe, and anything with a quote, comma, line break or edge space
 * is quoted with inner quotes doubled.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * A whole file: header plus rows, CRLF line endings (RFC 4180, and what Excel
 * expects), with a UTF-8 byte-order mark so Excel on Windows reads accented
 * names as UTF-8 instead of mangling them.
 */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** "Year 12 Chemistry!" → "year-12-chemistry". ASCII only, never empty. */
export function slugForFilename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return slug || 'class'
}

export function csvFilename(className: string, scope: ExportScope, now: Date = new Date()): string {
  return `${slugForFilename(className)}-${scope === 'assignments' ? 'sets' : 'attempts'}-${now
    .toISOString()
    .slice(0, 10)}.csv`
}

/** The header value. The filename is ASCII by construction, so no filename*. */
export function contentDisposition(filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  return `attachment; filename="${safe}"`
}

/** "2026-09-25 16:00" in UTC — sortable, and read as a date by every spreadsheet. */
export function csvDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export type ExportStudent = { id: string; full_name: string | null; joined_at: string | null }

/**
 * Display label per student id: displayName(), with " (2)", " (3)" … added to
 * the second and later students who would otherwise print identically.
 * Numbered by join date (then id), so the same student keeps the same label
 * from one export to the next.
 */
export function exportStudentLabels(students: readonly ExportStudent[]): Map<string, string> {
  const ordered = [...students].sort((a, b) => {
    const aj = a.joined_at ? Date.parse(a.joined_at) : Infinity
    const bj = b.joined_at ? Date.parse(b.joined_at) : Infinity
    if (aj !== bj) return aj - bj
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const seen = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const s of ordered) {
    const base = displayName(s.full_name)
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    labels.set(s.id, n === 1 ? base : `${base} (${n})`)
  }
  return labels
}

// ---------------------------------------------------------------------------
// Scope: assignments — one row per student per published set
// ---------------------------------------------------------------------------

export type ExportAssignment = Pick<
  Assignment,
  'id' | 'title' | 'kind' | 'is_mock' | 'target' | 'due_at' | 'published_at' | 'closed_at' | 'archived_at'
>

export const ASSIGNMENTS_HEADER = [
  'Student',
  'Set',
  'Kind',
  'Mock',
  'Due (UTC)',
  'Extended to (UTC)',
  'Status',
  'Items handed in',
  'Items',
  'Marks',
  'Out of',
  'Percent',
  'First handed in (UTC)',
  'Last handed in (UTC)',
] as const

const KIND_LABEL: Record<Assignment['kind'], string> = {
  question_set: 'Questions',
  whole_paper: 'Whole paper',
  topic_drill: 'Topic drill',
  practice_prompt: 'Practice prompt',
}

/**
 * One word for where a student is on a set, as a markbook column wants it.
 * "Missing" only once their deadline (with any extension) has passed — before
 * that it is "Not yet", which is not a problem.
 */
export function setStatusLabel(
  state: Pick<StudentAssignmentState, 'items' | 'excused' | 'is_late' | 'extended_due_at'>,
  dueAt: string | null,
  now: Date = new Date()
): string {
  const total = state.items.length
  const handed = state.items.filter((i) => HANDED_IN_STATES.has(i.state)).length
  if (total > 0 && handed === total) {
    if (state.items.every((i) => i.state === 'reviewed')) return 'Reviewed'
    return state.is_late ? 'Handed in late' : 'Handed in'
  }
  if (handed > 0) return state.is_late ? 'Part done (late)' : 'Part done'
  if (state.excused) return 'Excused'
  const deadline = effectiveDueAt(dueAt, state.extended_due_at)
  if (deadline && Date.parse(deadline) < now.getTime()) return 'Missing'
  return 'Not yet'
}

function isTargeted(
  assignment: ExportAssignment,
  studentId: string,
  flags: ReadonlyMap<string, AssignmentStudentFlags>
): boolean {
  return assignment.target === 'all' || flags.has(`${assignment.id}:${studentId}`)
}

export function buildAssignmentsCsv(input: {
  students: readonly ExportStudent[]
  assignments: readonly ExportAssignment[]
  items: readonly AssignmentItem[]
  submissions: readonly AssignmentSubmission[]
  flags: readonly AssignmentStudentFlags[]
  now?: Date
}): { header: readonly string[]; rows: unknown[][]; truncated: boolean } {
  const now = input.now ?? new Date()
  const labels = exportStudentLabels(input.students)

  const itemsBySet = new Map<string, AssignmentItem[]>()
  for (const item of input.items) {
    const list = itemsBySet.get(item.assignment_id) ?? []
    list.push(item)
    itemsBySet.set(item.assignment_id, list)
  }
  for (const list of itemsBySet.values()) list.sort((a, b) => a.position - b.position)

  const subsByKey = new Map<string, AssignmentSubmission[]>()
  for (const sub of input.submissions) {
    const key = `${sub.assignment_id}:${sub.student_id}`
    const list = subsByKey.get(key) ?? []
    list.push(sub)
    subsByKey.set(key, list)
  }

  const flagsByKey = new Map<string, AssignmentStudentFlags>()
  for (const f of input.flags) flagsByKey.set(`${f.assignment_id}:${f.student_id}`, f)

  // Sets in the order they were set; students alphabetically within each.
  const sets = input.assignments
    .filter((a) => a.published_at && !a.archived_at)
    .sort((a, b) => Date.parse(a.published_at ?? '') - Date.parse(b.published_at ?? '') || (a.id < b.id ? -1 : 1))
  const students = [...input.students].sort((a, b) =>
    (labels.get(a.id) ?? '').localeCompare(labels.get(b.id) ?? '', 'en', { sensitivity: 'base' })
  )

  const rows: unknown[][] = []
  for (const set of sets) {
    const items = itemsBySet.get(set.id) ?? []
    for (const student of students) {
      if (!isTargeted(set, student.id, flagsByKey)) continue
      if (rows.length >= MAX_EXPORT_ROWS) return { header: ASSIGNMENTS_HEADER, rows, truncated: true }
      const flags = flagsByKey.get(`${set.id}:${student.id}`) ?? null
      const submissions = subsByKey.get(`${set.id}:${student.id}`) ?? []
      const state = deriveStudentState({
        membership: 'active',
        items,
        submissions,
        flags,
        due_at: set.due_at,
      })
      const handedIn = state.items.filter((i) => HANDED_IN_STATES.has(i.state))
      const scored = handedIn.filter(
        (i) => i.marks_earned !== null && i.total_marks !== null && i.total_marks > 0
      )
      const firsts = submissions.map((s) => Date.parse(s.first_submitted_at)).filter(Number.isFinite)
      const lasts = submissions.map((s) => Date.parse(s.last_submitted_at)).filter(Number.isFinite)
      rows.push([
        labels.get(student.id) ?? displayName(student.full_name),
        set.title,
        KIND_LABEL[set.kind] ?? set.kind,
        set.is_mock,
        csvDate(set.due_at),
        csvDate(flags?.extended_due_at ?? null),
        setStatusLabel(state, set.due_at, now),
        handedIn.length,
        items.length,
        scored.length ? scored.reduce((sum, i) => sum + (i.marks_earned ?? 0), 0) : null,
        scored.length ? scored.reduce((sum, i) => sum + (i.total_marks ?? 0), 0) : null,
        state.overall_pct,
        firsts.length ? csvDate(new Date(Math.min(...firsts)).toISOString()) : '',
        lasts.length ? csvDate(new Date(Math.max(...lasts)).toISOString()) : '',
      ])
    }
  }
  return { header: ASSIGNMENTS_HEADER, rows, truncated: false }
}

// ---------------------------------------------------------------------------
// Scope: attempts — one row per marked attempt in the class's view
// ---------------------------------------------------------------------------

export type ExportAttempt = {
  id: string
  user_id: string
  created_at: string
  marks_earned: number | null
  total_marks: number | null
  time_spent_seconds?: number | null
  assignment_item_id?: string | null
  mark_schemes?:
    | { paper_code: string | null; paper_session?: string | null; question_number?: string | null }
    | Array<{ paper_code: string | null; paper_session?: string | null; question_number?: string | null }>
    | null
}

export const ATTEMPTS_HEADER = [
  'Student',
  'Marked (UTC)',
  'Paper',
  'Session',
  'Question',
  'Marks',
  'Out of',
  'Percent',
  'Set',
  'Minutes',
] as const

function scheme(a: ExportAttempt) {
  const ms = a.mark_schemes
  if (!ms) return null
  return Array.isArray(ms) ? (ms[0] ?? null) : ms
}

export function buildAttemptsCsv(input: {
  students: readonly ExportStudent[]
  attempts: readonly ExportAttempt[]
  /** assignment_items.id → the set's title, for attempts marked from a set link. */
  setTitleByItem: ReadonlyMap<string, string>
}): { header: readonly string[]; rows: unknown[][]; truncated: boolean } {
  const labels = exportStudentLabels(input.students)
  const allowed = new Set(input.students.map((s) => s.id))
  const attempts = input.attempts
    .filter((a) => allowed.has(a.user_id))
    .sort((a, b) => {
      const byName = (labels.get(a.user_id) ?? '').localeCompare(labels.get(b.user_id) ?? '', 'en', {
        sensitivity: 'base',
      })
      return byName || Date.parse(a.created_at) - Date.parse(b.created_at)
    })

  const rows: unknown[][] = []
  for (const a of attempts) {
    if (rows.length >= MAX_EXPORT_ROWS) return { header: ATTEMPTS_HEADER, rows, truncated: true }
    const ms = scheme(a)
    const earned = typeof a.marks_earned === 'number' ? a.marks_earned : null
    const total = typeof a.total_marks === 'number' ? a.total_marks : null
    const pct = earned !== null && total !== null && total > 0 ? Math.round((earned / total) * 1000) / 10 : null
    const seconds = typeof a.time_spent_seconds === 'number' && a.time_spent_seconds > 0 ? a.time_spent_seconds : null
    rows.push([
      labels.get(a.user_id) ?? '',
      csvDate(a.created_at),
      ms?.paper_code ?? '',
      ms?.paper_session ?? '',
      ms?.question_number ?? '',
      earned,
      total,
      pct,
      a.assignment_item_id ? (input.setTitleByItem.get(a.assignment_item_id) ?? '') : '',
      seconds === null ? null : Math.round(seconds / 6) / 10,
    ])
  }
  return { header: ATTEMPTS_HEADER, rows, truncated: false }
}
