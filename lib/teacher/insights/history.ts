/**
 * One student's marked work, as their teacher pages through it
 * (GET T/students/[sid]/history and the student page's StudentAttemptHistory;
 * docs/TEACHER_SYSTEM_SPEC.md §3, §4).
 *
 * The list is keyset-paginated on (created_at desc, id desc) and filtered to
 * the classroom's privacy rule — marked since the student joined, in the
 * class's subject (scopeClassroomAttempts). The subject part cannot be pushed
 * into the query (attempts carry no subject column; it is inferred from the
 * paper code, the tags and the question text), so a page is assembled by
 * scanning batches in order and keeping the in-scope rows. The cursor is the
 * last row SCANNED, not the last row kept, so nothing is skipped or repeated
 * however many out-of-scope rows sit between two pages.
 *
 * Also here: the row a history entry becomes, and the rule for how often
 * viewing a student is written to the audit log.
 *
 * Pure: no I/O and no clock except the `now` passed in.
 */

import type { ClassroomAttempt } from '@/lib/teacher-analytics'
import type { ReviewDecision } from '@/lib/teacher/types'
import { isUuid } from '@/lib/teacher/assignments/validate'

/** Rows per page (spec §3: 30/page). */
export const HISTORY_PAGE_SIZE = 30
/** Rows read per round trip while assembling a page. */
export const HISTORY_SCAN_BATCH = 60
/**
 * Rows examined per request before answering with what was found so far and
 * a cursor to continue. Bounds the work one request can do for a student
 * whose history is mostly in another subject.
 */
export const HISTORY_MAX_SCAN = 600

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

export type HistoryCursor = { created_at: string; id: string }

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(raw: string): string {
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
}

/** Opaque to clients: base64url JSON of the last scanned row's sort key. */
export function encodeHistoryCursor(cursor: HistoryCursor): string {
  return toBase64Url(JSON.stringify([cursor.created_at, cursor.id]))
}

/**
 * The cursor, or null for anything that is not one. Both values are
 * re-validated because they are interpolated into a PostgREST filter string
 * (historyCursorFilter): only a real ISO instant and a uuid get through.
 */
export function decodeHistoryCursor(raw: string | null | undefined): HistoryCursor | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(raw))
    if (!Array.isArray(parsed) || parsed.length !== 2) return null
    const [createdAt, id] = parsed
    if (typeof createdAt !== 'string' || !ISO_INSTANT.test(createdAt)) return null
    if (!Number.isFinite(Date.parse(createdAt))) return null
    if (!isUuid(id)) return null
    return { created_at: createdAt, id: id.toLowerCase() }
  } catch {
    return null
  }
}

/** PostgREST `or` filter for "strictly after this cursor" in (created_at desc, id desc). */
export function historyCursorFilter(cursor: HistoryCursor): string {
  return `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.lt.${cursor.id})`
}

// ---------------------------------------------------------------------------
// Assembling a page from scanned batches
// ---------------------------------------------------------------------------

export type HistoryScan<T> = {
  /** In-scope rows kept so far, in order. */
  rows: T[]
  /** Sort key of the last row examined (the next request continues after it). */
  last: HistoryCursor | null
  /** Rows examined so far. */
  scanned: number
  /** True once the query has no rows after `last`. */
  exhausted: boolean
  /** True once `rows` holds a full page. */
  full: boolean
}

export function startHistoryScan<T>(after: HistoryCursor | null): HistoryScan<T> {
  return { rows: [], last: after, scanned: 0, exhausted: false, full: false }
}

/**
 * Feed one batch (asked for with `limit = requested`, in sort order, strictly
 * after `scan.last`). Rows are taken until the page is full; the cursor
 * advances over every row examined, kept or not. A batch shorter than asked
 * for means the query is exhausted — but only if the whole batch was
 * examined: a page that filled part-way through still has rows after it.
 */
export function advanceHistoryScan<T extends { id: string; created_at: string }>(
  scan: HistoryScan<T>,
  batch: readonly T[],
  opts: { requested: number; pageSize: number; keep: (row: T) => boolean }
): HistoryScan<T> {
  const rows = [...scan.rows]
  let last = scan.last
  let scanned = scan.scanned
  let consumed = 0
  for (const row of batch) {
    if (rows.length >= opts.pageSize) break
    consumed += 1
    scanned += 1
    last = { created_at: row.created_at, id: row.id }
    if (opts.keep(row)) rows.push(row)
  }
  const exhausted = batch.length < opts.requested && consumed === batch.length
  return { rows, last, scanned, exhausted, full: rows.length >= opts.pageSize }
}

/** Whether to read another batch. */
export function historyScanContinues(scan: HistoryScan<unknown>, maxScan = HISTORY_MAX_SCAN): boolean {
  return !scan.full && !scan.exhausted && scan.scanned < maxScan
}

/** The cursor for the next page, or null when there is nothing after this one. */
export function nextHistoryCursor(scan: HistoryScan<unknown>): string | null {
  if (scan.exhausted || !scan.last) return null
  return encodeHistoryCursor(scan.last)
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type StudentHistoryRow = {
  id: string
  created_at: string
  /** Null while there is no usable mark (a whole paper still marking, a missing total). */
  marks_earned: number | null
  total_marks: number | null
  pct: number | null
  /** "9709/12 · May/June 2024 · Q3", "Whole paper · 9709/12 · May/June 2024", or "Practice question". */
  work: string
  /** The question's opening words, on one line (≤ PREVIEW_CHARS). Never the mark scheme. */
  preview: string | null
  /** Syllabus codes the marker tagged (first few). */
  topics: string[]
  /** Marked against bands or criteria rather than point by point. */
  judgement: boolean
  assignment_item_id: string | null
  /** The set this script was handed in to, when it is one of the teacher's. */
  set: { id: string; classroom_id: string; title: string } | null
  /** The teacher's latest decision on the script (OK / OV / FLG), if any. */
  decision: ReviewDecision | null
  decided_at: string | null
}

export const PREVIEW_CHARS = 140
const MAX_TOPICS = 4

/** First `max` characters of a question on one line, cut at a word, with an ellipsis. */
export function questionPreviewLine(text: string | null | undefined, max = PREVIEW_CHARS): string | null {
  if (typeof text !== 'string') return null
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return null
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

/** What the script was: a banked question, a whole paper, or the student's own question. */
export function workLabel(
  a: Pick<ClassroomAttempt, 'mark_schemes' | 'ai_marking' | 'mark_scheme_id'>
): string {
  const scheme = a.mark_schemes
  if (scheme?.paper_code) {
    return [scheme.paper_code, scheme.paper_session, scheme.question_number ? `Q${scheme.question_number}` : null]
      .filter(Boolean)
      .join(' · ')
  }
  const paper = a.ai_marking?.paper_code
  if (paper && !a.mark_scheme_id) {
    return ['Whole paper', paper, a.ai_marking?.paper_session].filter(Boolean).join(' · ')
  }
  return 'Practice question'
}

function usable(a: Pick<ClassroomAttempt, 'marks_earned' | 'total_marks'>): { earned: number; total: number } | null {
  const total = a.total_marks
  const earned = a.marks_earned
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return null
  if (typeof earned !== 'number' || !Number.isFinite(earned)) return null
  return { earned: Math.max(0, Math.min(earned, total)), total }
}

export function toHistoryRow(
  a: ClassroomAttempt,
  extra: {
    decision?: { decision: ReviewDecision; created_at: string } | null
    set?: StudentHistoryRow['set']
  } = {}
): StudentHistoryRow {
  const marks = usable(a)
  return {
    id: a.id,
    created_at: a.created_at,
    marks_earned: marks ? marks.earned : null,
    total_marks: marks ? marks.total : null,
    pct: marks ? Math.round((marks.earned / marks.total) * 1000) / 10 : null,
    work: workLabel(a),
    preview: questionPreviewLine(a.question_text),
    topics: [...new Set((a.syllabus_tags ?? []).filter((t) => typeof t === 'string' && t.trim()))].slice(0, MAX_TOPICS),
    judgement: a.ai_marking?.judgement_marking === true,
    assignment_item_id: a.assignment_item_id ?? null,
    set: extra.set ?? null,
    decision: extra.decision?.decision ?? null,
    decided_at: extra.decision?.created_at ?? null,
  }
}

/**
 * The newest decision per attempt from teacher_overrides rows (any order).
 * Ties on created_at go to the larger id, so the answer never depends on row
 * order.
 */
export function latestDecisions(
  rows: ReadonlyArray<{ id: string; attempt_id: string; decision: ReviewDecision; created_at: string }>
): Map<string, { decision: ReviewDecision; created_at: string }> {
  const best = new Map<string, { id: string; decision: ReviewDecision; created_at: string; ms: number }>()
  for (const r of rows) {
    const ms = Date.parse(r.created_at)
    if (!Number.isFinite(ms)) continue
    const held = best.get(r.attempt_id)
    if (!held || ms > held.ms || (ms === held.ms && r.id > held.id)) {
      best.set(r.attempt_id, { id: r.id, decision: r.decision, created_at: r.created_at, ms })
    }
  }
  return new Map([...best].map(([k, v]) => [k, { decision: v.decision, created_at: v.created_at }]))
}

// ---------------------------------------------------------------------------
// Audit: how often "viewed this student" is written
// ---------------------------------------------------------------------------

/**
 * One `view_student` row per teacher, per student, per viewing session. A
 * session is a sitting: a row is written when the teacher opens the student
 * and there is no row from them about that student in the last hour. Paging
 * the history, reloading, or coming back from a script within the hour adds
 * nothing; a teacher who keeps browsing the student for an afternoon leaves
 * one row an hour. Server-side on purpose — a client-held "already logged"
 * marker could be forged to keep views out of the log.
 */
export const VIEW_AUDIT_WINDOW_MS = 60 * 60_000

export function viewAuditDue(lastLoggedAt: string | null | undefined, nowMs: number): boolean {
  if (!lastLoggedAt) return true
  const last = Date.parse(lastLoggedAt)
  if (!Number.isFinite(last)) return true
  // A row stamped in the future (clock skew) still counts as recent.
  return nowMs - last >= VIEW_AUDIT_WINDOW_MS
}
