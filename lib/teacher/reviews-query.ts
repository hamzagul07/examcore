import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { truncateMarkingPreview } from '@/lib/rich-text/truncate-marking-preview'
import { isUuid } from '@/lib/teacher/assignments/validate'
import { displayName } from '@/lib/teacher/display-name'
import type { FeedbackNote } from '@/lib/teacher/feedback'
import { scriptMarkingMode, type ScriptMarkingMode } from '@/lib/teacher/override-validate'
import { scoreReviewPriority } from '@/lib/teacher/review-priority'
import type { ReviewDecision, ReviewQueueItem } from '@/lib/teacher/types'
import {
  scopeClassroomAttempts,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import {
  attachSchemes,
  attemptColumns,
  chunk,
  fetchAllFiltered,
  getMembersForClassrooms,
  getStudentProfiles,
  toClassroomAttempt,
  type AttemptRow,
} from '@/lib/teacher-classroom-data'

/**
 * The teacher's review inbox and one script's review page
 * (docs/TEACHER_SYSTEM_SPEC.md §3 `/api/teacher/reviews`, §4 `/teacher/reviews`).
 *
 * WHICH scripts. The same privacy rule as every other teacher read (spec §8,
 * scopeClassroomAttempts): work by an ACTIVE member of one of the teacher's
 * live classes, marked at or after they joined, in that class's subject —
 * or, whatever its subject, handed in against one of that class's sets. Only
 * scripts with AI marking and a mark are reviewable. The inbox covers work
 * marked in the last REVIEW_WINDOW_DAYS (the review page of an older script
 * still opens — it is the queue that is bounded, not access); filtering by a
 * set adds every script handed in against it, however old.
 *
 * WHAT ORDER. `scoreReviewPriority` (lib/teacher/review-priority.ts) descending,
 * then newest first, then attempt id — a total order, so the keyset cursor
 * below never skips or repeats a script that did not change between pages.
 * Priority is computed here, not stored, so a page is cut from the sorted
 * list rather than by a SQL `where`: the cursor is the last row's
 * (priority, created_at, id).
 *
 * WHOSE decision. A script's status is the calling teacher's own latest
 * decision on it (RLS on teacher_overrides returns only their rows); a
 * decision's AI snapshot, by contrast, is read across teachers by the
 * override route (lib/teacher/override-validate.ts resolveAiSnapshot).
 *
 * NAMES only through teacher_student_profiles (getStudentProfiles), formatted
 * with displayName(). Clients: the teacher's RLS client for every read that
 * decides what is visible; the service client only for mark_schemes paper
 * codes (attachSchemes), after the attempts were read under RLS.
 */

// ---------------------------------------------------------------------------
// Constants and types
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = ['pending', 'confirmed', 'overridden', 'flagged'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  overridden: 'Re-marked',
  flagged: 'Flagged',
}

/** How far back the inbox looks. A term is ~13 weeks; older work lives on the student page. */
export const REVIEW_WINDOW_DAYS = 90
/** Newest scripts read per request before the inbox says it is showing only part of the window. */
export const MAX_REVIEW_CANDIDATES = 3000
export const DEFAULT_REVIEW_PAGE = 20
export const MAX_REVIEW_PAGE = 50
/** Sets listed in the filter form. */
const MAX_SET_OPTIONS = 100
/** A slip at or above this priority gets the crimson spine (.ms-review-slip--high). */
export const HIGH_REVIEW_PRIORITY = 40

const DAY_MS = 86_400_000

export type ReviewFilters = {
  classroom_id: string | null
  student_id: string | null
  assignment_id: string | null
  status: ReviewStatus | null
}

export const EMPTY_REVIEW_FILTERS: ReviewFilters = {
  classroom_id: null,
  student_id: null,
  assignment_id: null,
  status: null,
}

export type ReviewCounts = Record<ReviewStatus, number> & { total: number }

/** A queue row: the §2.1 ReviewQueueItem plus what the slip prints. */
export type ReviewInboxItem = ReviewQueueItem & {
  status: ReviewStatus
  classroom_name: string | null
  /** The set's title, else "9709/12 Q3", else null. */
  work_label: string | null
  /** The start of the question (may contain LaTeX; render with MarkSnippet). */
  question_preview: string | null
}

export type ReviewFieldError = { ok: false; error: string; field: string }

/** The sort key: priority desc, created_at desc, attempt_id desc. */
export type ReviewOrderKey = { priority: number; created_at: string; attempt_id: string }

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>

function param(source: ParamSource, key: string): string | null {
  const raw = source instanceof URLSearchParams ? source.get(key) : source[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * `?classroom_id&student_id&assignment_id&status` → filters, or the first bad
 * value as `{error, field}`. Empty values (what a GET form sends for "All")
 * mean "no filter", as does `status=all`.
 */
export function parseReviewFilters(source: ParamSource): { ok: true; value: ReviewFilters } | ReviewFieldError {
  const out: ReviewFilters = { ...EMPTY_REVIEW_FILTERS }
  const ids = [
    ['classroom_id', 'That class id is not valid.'],
    ['student_id', 'That student id is not valid.'],
    ['assignment_id', 'That set id is not valid.'],
  ] as const
  for (const [key, message] of ids) {
    const value = param(source, key)
    if (value === null) continue
    if (!isUuid(value)) return { ok: false, error: message, field: key }
    out[key] = value.toLowerCase()
  }
  const status = param(source, 'status')
  if (status !== null && status !== 'all') {
    if (!(REVIEW_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: 'Status must be pending, confirmed, overridden or flagged.', field: 'status' }
    }
    out.status = status as ReviewStatus
  }
  return { ok: true, value: out }
}

/** `?limit` → 1…MAX_REVIEW_PAGE; anything unreadable is the default page. */
export function parseReviewLimit(raw: string | null | undefined): number {
  const n = typeof raw === 'string' && /^\d{1,4}$/.test(raw.trim()) ? Number(raw.trim()) : NaN
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REVIEW_PAGE
  return Math.min(n, MAX_REVIEW_PAGE)
}

export function hasReviewFilters(filters: ReviewFilters): boolean {
  return Boolean(filters.classroom_id || filters.student_id || filters.assignment_id || filters.status)
}

/**
 * The query string for a filter set (no leading "?"), in a fixed key order so
 * the same filters always make the same URL. Used for the inbox, detail links
 * (so prev/next stay inside the filter) and the API's "Load more".
 */
export function reviewFilterQuery(filters: ReviewFilters, extra: { cursor?: string | null; limit?: number | null } = {}): string {
  const params = new URLSearchParams()
  if (filters.classroom_id) params.set('classroom_id', filters.classroom_id)
  if (filters.student_id) params.set('student_id', filters.student_id)
  if (filters.assignment_id) params.set('assignment_id', filters.assignment_id)
  if (filters.status) params.set('status', filters.status)
  if (extra.limit) params.set('limit', String(extra.limit))
  if (extra.cursor) params.set('cursor', extra.cursor)
  return params.toString()
}

export function reviewsInboxHref(filters: ReviewFilters, cursor?: string | null): string {
  const q = reviewFilterQuery(filters, { cursor })
  return q ? `/teacher/reviews?${q}` : '/teacher/reviews'
}

export function reviewDetailHref(attemptId: string, filters: ReviewFilters): string {
  const q = reviewFilterQuery(filters)
  return `/teacher/reviews/${attemptId}${q ? `?${q}` : ''}`
}

// ---------------------------------------------------------------------------
// Status, order, cursor, pages
// ---------------------------------------------------------------------------

export function reviewStatusOf(decision: ReviewDecision | null | undefined): ReviewStatus {
  if (decision === 'confirm') return 'confirmed'
  if (decision === 'override') return 'overridden'
  if (decision === 'flag') return 'flagged'
  return 'pending'
}

export function emptyReviewCounts(): ReviewCounts {
  return { pending: 0, confirmed: 0, overridden: 0, flagged: 0, total: 0 }
}

export function countReviewStatuses(items: ReadonlyArray<{ status: ReviewStatus }>): ReviewCounts {
  const counts = emptyReviewCounts()
  for (const item of items) {
    counts[item.status] += 1
    counts.total += 1
  }
  return counts
}

function ms(iso: string): number {
  const n = Date.parse(iso)
  return Number.isFinite(n) ? n : 0
}

/** Negative when `a` comes first: priority desc, then newest, then attempt id desc. */
export function compareReviewOrder(a: ReviewOrderKey, b: ReviewOrderKey): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  const t = ms(b.created_at) - ms(a.created_at)
  if (t !== 0) return t
  if (a.attempt_id === b.attempt_id) return 0
  return a.attempt_id < b.attempt_id ? 1 : -1
}

export function sortReviewItems<T extends ReviewOrderKey>(items: readonly T[]): T[] {
  return [...items].sort(compareReviewOrder)
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/

/**
 * Opaque to clients: base64url JSON of the last row's sort key. Every part is
 * re-validated on the way back in — a cursor is user input.
 */
export function encodeReviewCursor(key: ReviewOrderKey): string {
  return Buffer.from(JSON.stringify([key.priority, key.created_at, key.attempt_id]), 'utf8').toString('base64url')
}

export function decodeReviewCursor(raw: string | null | undefined): ReviewOrderKey | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!Array.isArray(parsed) || parsed.length !== 3) return null
    const [priority, createdAt, attemptId] = parsed
    if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 0 || priority > 100) return null
    if (typeof createdAt !== 'string' || !ISO_INSTANT.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
      return null
    }
    if (!isUuid(attemptId)) return null
    return { priority, created_at: createdAt, attempt_id: attemptId.toLowerCase() }
  } catch {
    return null
  }
}

/**
 * One page of an already sorted list: the rows strictly after `cursor`, and
 * the cursor for the page after (null on the last page).
 */
export function pageReviewItems<T extends ReviewOrderKey>(
  sorted: readonly T[],
  cursor: ReviewOrderKey | null,
  limit: number
): { items: T[]; next_cursor: string | null } {
  const size = Math.max(1, Math.min(MAX_REVIEW_PAGE, Math.floor(limit) || DEFAULT_REVIEW_PAGE))
  const start = cursor ? sorted.findIndex((item) => compareReviewOrder(cursor, item) < 0) : 0
  if (start < 0) return { items: [], next_cursor: null }
  const items = sorted.slice(start, start + size)
  const last = items[items.length - 1]
  const next_cursor = last && start + size < sorted.length ? encodeReviewCursor(last) : null
  return { items, next_cursor }
}

/**
 * The scripts either side of one in a sorted filter, for the review page's
 * prev/next. When the script is not in the list (a "pending" filter after it
 * was decided, say), its neighbours are found by where its key would sort.
 */
export function reviewNeighbours<T extends ReviewOrderKey>(
  sorted: readonly T[],
  attemptId: string,
  fallbackKey: ReviewOrderKey | null
): { prev: T | null; next: T | null; index: number | null; total: number } {
  const total = sorted.length
  const index = sorted.findIndex((item) => item.attempt_id === attemptId)
  if (index >= 0) {
    return { prev: sorted[index - 1] ?? null, next: sorted[index + 1] ?? null, index, total }
  }
  if (!fallbackKey) return { prev: null, next: sorted[0] ?? null, index: null, total }
  let insertion = sorted.findIndex((item) => compareReviewOrder(fallbackKey, item) < 0)
  if (insertion < 0) insertion = total
  return { prev: sorted[insertion - 1] ?? null, next: sorted[insertion] ?? null, index: null, total }
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

/**
 * Each attempt's author's marks-weighted average over their OTHER scripts in
 * the list, and how many scripts that rests on — the "unusual for this
 * student" signal in scoreReviewPriority. Scripts without a total are skipped.
 */
export function studentBaselines(
  attempts: ReadonlyArray<{ id: string; user_id: string; marks_earned: number; total_marks: number }>
): Map<string, { mean_pct: number | null; count: number }> {
  const sums = new Map<string, { earned: number; total: number; n: number }>()
  const usable = (a: { marks_earned: number; total_marks: number }) =>
    Number.isFinite(a.marks_earned) && Number.isFinite(a.total_marks) && a.total_marks > 0
  for (const a of attempts) {
    if (!usable(a)) continue
    const s = sums.get(a.user_id) ?? { earned: 0, total: 0, n: 0 }
    s.earned += Math.max(0, Math.min(a.marks_earned, a.total_marks))
    s.total += a.total_marks
    s.n += 1
    sums.set(a.user_id, s)
  }
  const out = new Map<string, { mean_pct: number | null; count: number }>()
  for (const a of attempts) {
    const s = sums.get(a.user_id) ?? { earned: 0, total: 0, n: 0 }
    const self = usable(a)
    const earned = s.earned - (self ? Math.max(0, Math.min(a.marks_earned, a.total_marks)) : 0)
    const total = s.total - (self ? a.total_marks : 0)
    const count = s.n - (self ? 1 : 0)
    out.set(a.id, { mean_pct: total > 0 ? (earned / total) * 100 : null, count })
  }
  return out
}

/** A–E percentage bands mean nothing for IB (1–7) or AP (1–5) classes. */
export function letterGradesFor(classroom: { board?: string | null; subject_code?: string | null }): boolean {
  const code = (classroom.subject_code ?? '').trim().toLowerCase()
  if (code.startsWith('ib-') || code.startsWith('ap-')) return false
  const board = (classroom.board ?? '').trim().toUpperCase()
  return board !== 'IB' && board !== 'AP'
}

function oneLine(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null
  const flat = value.replace(/\s+/g, ' ').trim()
  if (!flat) return null
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

/** "Algebra drill", "9709/12 Q3", "9709/12", or null — what a script was an answer to. */
export function reviewWorkLabel(input: {
  setTitle?: string | null
  paperCode?: string | null
  questionNumber?: string | null
}): string | null {
  const set = oneLine(input.setTitle, 80)
  if (set) return set
  const paper = oneLine(input.paperCode, 20)
  const q = oneLine(input.questionNumber, 12)
  if (paper && q) return `${paper} Q${q.replace(/^q/i, '')}`
  return paper
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * The marker's judgement on a script with no per-mark list, as label/value
 * pairs for the console: a level-of-response band, IB criteria, or an MCQ
 * tally. Empty for per-mark scripts and anything unreadable.
 */
export function aiJudgementSummary(aiMarking: unknown): Array<{ label: string; value: string }> {
  const ai = isPlainObject(aiMarking) ? aiMarking : {}
  const out: Array<{ label: string; value: string }> = []
  const band = ai.band_result
  if (isPlainObject(band)) {
    const level = num(band.level)
    const got = num(band.marks_awarded)
    const of = num(band.marks_available)
    if (level !== null) out.push({ label: 'Band', value: `Level ${level}` })
    if (got !== null && of !== null) out.push({ label: 'Band marks', value: `${got}/${of}` })
  }
  if (Array.isArray(ai.criteria_results)) {
    for (const c of ai.criteria_results.slice(0, 12)) {
      if (!isPlainObject(c)) continue
      const id = oneLine(typeof c.criterion === 'string' ? c.criterion : null, 12)
      const name = oneLine(typeof c.criterion_name === 'string' ? c.criterion_name : null, 40)
      const got = num(c.marks_awarded)
      const of = num(c.marks_available)
      if (!id || got === null || of === null) continue
      out.push({ label: name ? `${id} · ${name}` : `Criterion ${id}`, value: `${got}/${of}` })
    }
  }
  if (Array.isArray(ai.mcq_breakdown) && ai.mcq_breakdown.length > 0) {
    const rows = ai.mcq_breakdown.filter(isPlainObject)
    const right = rows.filter((r) => r.correct === true).length
    out.push({ label: 'Correct answers', value: `${right}/${rows.length}` })
  }
  return out
}

// ---------------------------------------------------------------------------
// Assembly (pure — everything the loader read, in; the sorted queue, out)
// ---------------------------------------------------------------------------

export type ReviewClass = {
  id: string
  name: string
  subject_code: string | null
  board: string | null
  archived_at: string | null
}

export type ReviewSet = { id: string; classroom_id: string; title: string; is_mock: boolean }

export type ReviewQueueInput = {
  /** The classes in scope, in the order a script is claimed by them (live only). */
  classes: readonly ReviewClass[]
  /** Active members per class. */
  members: ReadonlyMap<string, readonly ClassroomMember[]>
  /** Scripts in the window (not yet scoped). */
  attempts: readonly ClassroomAttempt[]
  /** Scripts handed in against the filtered set, outside the window (not yet scoped). */
  linked?: readonly ClassroomAttempt[]
  /** attempt id → set id, for scripts handed in against one of the teacher's sets. */
  links: ReadonlyMap<string, string>
  sets: ReadonlyMap<string, ReviewSet>
  /** attempt id → the teacher's latest decision. */
  decisions: ReadonlyMap<string, ReviewDecision>
  /** student id → full name (teacher_student_profiles). */
  names: ReadonlyMap<string, string | null>
  filters: ReviewFilters
}

/**
 * Scope, filter, score and sort. `counts` are over the class/student/set
 * filters but NOT the status filter (so the status picker can show them);
 * `items` have every filter applied, sorted by compareReviewOrder.
 */
export function assembleReviewQueue(input: ReviewQueueInput): { items: ReviewInboxItem[]; counts: ReviewCounts } {
  const byId = new Map<string, ClassroomAttempt>()
  for (const a of input.attempts) byId.set(a.id, a)
  for (const a of input.linked ?? []) if (!byId.has(a.id)) byId.set(a.id, a)
  const all = [...byId.values()]

  // Which classes accept each script: the class's own rule (joined, subject),
  // or — for a script handed in against one of the class's sets — joined only.
  const accepted = new Map<string, Set<string>>()
  for (const c of input.classes) {
    const members = input.members.get(c.id) ?? []
    const ok = new Set(scopeClassroomAttempts(all, members, { subjectCode: c.subject_code }).map((a) => a.id))
    const setWork = all.filter((a) => {
      const setId = input.links.get(a.id)
      return setId !== undefined && input.sets.get(setId)?.classroom_id === c.id && !ok.has(a.id)
    })
    for (const a of scopeClassroomAttempts(setWork, members, { subjectCode: null })) ok.add(a.id)
    accepted.set(c.id, ok)
  }

  const classById = new Map(input.classes.map((c) => [c.id, c]))
  const claimed: Array<{ attempt: ClassroomAttempt; classroom: ReviewClass; set: ReviewSet | null }> = []
  for (const a of all) {
    const setId = input.links.get(a.id)
    const set = setId ? (input.sets.get(setId) ?? null) : null
    let home: ReviewClass | null = null
    const preferred = set ? classById.get(set.classroom_id) : undefined
    if (preferred && accepted.get(preferred.id)?.has(a.id)) home = preferred
    if (!home) home = input.classes.find((c) => accepted.get(c.id)?.has(a.id)) ?? null
    if (!home) continue
    claimed.push({ attempt: a, classroom: home, set: set && set.classroom_id === home.id ? set : null })
  }

  // The baseline is the student's other scoped work, before the student/set
  // filters narrow the list, so a script's priority is the same in every view.
  const baselines = studentBaselines(claimed.map((c) => c.attempt))

  const filtered = claimed.filter(({ attempt, set }) => {
    if (input.filters.student_id && attempt.user_id !== input.filters.student_id) return false
    if (input.filters.assignment_id && set?.id !== input.filters.assignment_id) return false
    return true
  })

  const items: ReviewInboxItem[] = filtered.map(({ attempt, classroom, set }) => {
    const decision = input.decisions.get(attempt.id) ?? null
    const baseline = baselines.get(attempt.id)
    const { priority, reasons } = scoreReviewPriority({
      marks_earned: attempt.marks_earned,
      total_marks: attempt.total_marks,
      ai_marking: attempt.ai_marking ?? null,
      error_classifications: attempt.error_classifications ?? null,
      decision,
      assignment: set ? { is_mock: set.is_mock } : null,
      student_mean_pct: baseline?.mean_pct ?? null,
      student_attempt_count: baseline?.count ?? 0,
      letter_grades: letterGradesFor(classroom),
    })
    const preview = truncateMarkingPreview(attempt.question_text ?? null, 110, '')
    return {
      attempt_id: attempt.id,
      student_id: attempt.user_id,
      display_name: displayName(input.names.get(attempt.user_id) ?? null),
      classroom_id: classroom.id,
      assignment_id: set?.id ?? null,
      created_at: attempt.created_at,
      marks_earned: attempt.marks_earned,
      total_marks: attempt.total_marks,
      decision,
      priority,
      reasons,
      status: reviewStatusOf(decision),
      classroom_name: classroom.name,
      work_label: reviewWorkLabel({
        setTitle: set?.title ?? null,
        paperCode: attempt.mark_schemes?.paper_code ?? attempt.ai_marking?.paper_code ?? null,
        questionNumber: attempt.mark_schemes?.question_number ?? null,
      }),
      question_preview: preview ? preview : null,
    }
  })

  const counts = countReviewStatuses(items)
  const shown = input.filters.status ? items.filter((i) => i.status === input.filters.status) : items
  return { items: sortReviewItems(shown), counts }
}

// ---------------------------------------------------------------------------
// Loading the queue
// ---------------------------------------------------------------------------

export type ReviewFilterOptions = {
  classes: Array<{ id: string; name: string; archived: boolean }>
  students: Array<{ id: string; name: string }>
  sets: Array<{ id: string; title: string; classroom_name: string | null }>
}

export type ReviewQueueLoad =
  | {
      ok: true
      /** Every matching script, sorted — page it with pageReviewItems. */
      items: ReviewInboxItem[]
      counts: ReviewCounts
      /** True when the window held more than MAX_REVIEW_CANDIDATES scripts (the newest were used). */
      truncated: boolean
      windowDays: number
      /** How many live classes the teacher has (0 → the "make a class" empty state). */
      liveClassCount: number
      options: ReviewFilterOptions | null
    }
  | { ok: false; status: 404; error: string; field: string }

type ClassRow = ReviewClass & { created_at?: string }
type SetRow = ReviewSet & { published_at: string | null; archived_at: string | null; created_at: string }

function unique(ids: Iterable<string | null | undefined>): string[] {
  const out = new Set<string>()
  for (const id of ids) if (typeof id === 'string' && id) out.add(id)
  return [...out]
}

function laterIso(a: string, b: string): string {
  return ms(a) >= ms(b) ? a : b
}

async function loadTeacherClasses(supabase: SupabaseClient, teacherId: string): Promise<ClassRow[]> {
  const { rows } = await fetchAllFiltered<ClassRow>('classrooms', (from, to) =>
    supabase
      .from('classrooms')
      .select('id, name, subject_code, board, archived_at, created_at')
      .eq('teacher_id', teacherId)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    subject_code: r.subject_code ?? null,
    board: r.board ?? null,
    archived_at: r.archived_at ?? null,
  }))
}

/**
 * Reviewable scripts (AI-marked, with a mark) by these students since their
 * lower bounds, newest first, capped at MAX_REVIEW_CANDIDATES overall.
 */
async function loadWindowAttempts(
  db: SupabaseClient,
  studentIds: readonly string[],
  lowerBound: ReadonlyMap<string, string>
): Promise<{ attempts: ClassroomAttempt[]; truncated: boolean }> {
  const columns = attemptColumns(true)
  const parts = await Promise.all(
    chunk(unique(studentIds)).map(async (part) => {
      // The loosest bound in the chunk; each student's own is applied by the scope filter.
      let bound: string | null = null
      for (const id of part) {
        const b = lowerBound.get(id)
        if (b && (bound === null || ms(b) < ms(bound))) bound = b
      }
      return fetchAllFiltered<AttemptRow>(
        'attempts',
        (from, to) => {
          let q = db
            .from('attempts')
            .select(columns)
            .in('user_id', part)
            .not('ai_marking', 'is', null)
            .not('marks_earned', 'is', null)
          if (bound) q = q.gte('created_at', bound)
          return q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to)
        },
        { maxRows: MAX_REVIEW_CANDIDATES }
      )
    })
  )
  let truncated = parts.some((p) => p.truncated)
  const attempts = parts.flatMap((p) => p.rows.map(toClassroomAttempt))
  attempts.sort((a, b) => ms(b.created_at) - ms(a.created_at) || (a.id < b.id ? 1 : -1))
  if (attempts.length > MAX_REVIEW_CANDIDATES) {
    attempts.length = MAX_REVIEW_CANDIDATES
    truncated = true
  }
  return { attempts, truncated }
}

/** Every script handed in against one set (hand-in rows + attempts stamped with its items). */
async function loadSetAttempts(
  db: SupabaseClient,
  setId: string,
  known: ReadonlySet<string>
): Promise<{ attempts: ClassroomAttempt[]; links: Map<string, string> }> {
  const [items, submissions] = await Promise.all([
    fetchAllFiltered<{ id: string }>('assignment_items', (from, to) =>
      db.from('assignment_items').select('id').eq('assignment_id', setId).order('id').range(from, to)
    ),
    fetchAllFiltered<{ id: string; attempt_id: string }>('assignment_submissions', (from, to) =>
      db
        .from('assignment_submissions')
        .select('id, attempt_id')
        .eq('assignment_id', setId)
        .not('attempt_id', 'is', null)
        .order('id')
        .range(from, to)
    ),
  ])
  const columns = attemptColumns(true)
  const links = new Map<string, string>()
  const rows = new Map<string, ClassroomAttempt>()

  const byId = unique(submissions.rows.map((s) => s.attempt_id)).filter((id) => !known.has(id))
  for (const id of submissions.rows.map((s) => s.attempt_id)) if (id) links.set(id, setId)
  const itemIds = unique(items.rows.map((i) => i.id))

  const reads: Array<Promise<{ rows: AttemptRow[] }>> = []
  for (const part of chunk(byId)) {
    reads.push(
      fetchAllFiltered<AttemptRow>('attempts', (from, to) =>
        db
          .from('attempts')
          .select(columns)
          .in('id', part)
          .not('ai_marking', 'is', null)
          .not('marks_earned', 'is', null)
          .order('id')
          .range(from, to)
      )
    )
  }
  for (const part of chunk(itemIds)) {
    reads.push(
      fetchAllFiltered<AttemptRow>('attempts', (from, to) =>
        db
          .from('attempts')
          .select(columns)
          .in('assignment_item_id', part)
          .not('ai_marking', 'is', null)
          .not('marks_earned', 'is', null)
          .order('id')
          .range(from, to)
      )
    )
  }
  for (const result of await Promise.all(reads)) {
    for (const row of result.rows) {
      links.set(row.id, setId)
      if (!known.has(row.id) && !rows.has(row.id)) rows.set(row.id, toClassroomAttempt(row))
    }
  }
  return { attempts: [...rows.values()], links }
}

/**
 * attempt → set for scripts handed in against one of these sets: the hand-in
 * row's counted attempt first, then attempts stamped with one of the sets' items.
 */
async function loadSetLinks(
  db: SupabaseClient,
  sets: ReadonlyMap<string, ReviewSet>,
  attempts: readonly ClassroomAttempt[]
): Promise<Map<string, string>> {
  const links = new Map<string, string>()
  if (sets.size === 0 || attempts.length === 0) return links
  const wanted = new Set(attempts.map((a) => a.id))
  // last_submitted_at is the student's latest hand-in on the item, never
  // earlier than the attempt the row counts — so a row counting a script from
  // this window was last submitted inside it.
  let since = attempts[0]?.created_at ?? null
  for (const a of attempts) if (since === null || ms(a.created_at) < ms(since)) since = a.created_at

  const setIds = [...sets.keys()]
  const [submissionParts, itemParts] = await Promise.all([
    Promise.all(
      chunk(setIds).map((part) =>
        fetchAllFiltered<{ id: string; attempt_id: string; assignment_id: string }>('assignment_submissions', (from, to) => {
          let q = db
            .from('assignment_submissions')
            .select('id, attempt_id, assignment_id')
            .in('assignment_id', part)
            .not('attempt_id', 'is', null)
          if (since) q = q.gte('last_submitted_at', since)
          return q.order('id').range(from, to)
        })
      )
    ),
    Promise.all(
      chunk(unique(attempts.map((a) => a.assignment_item_id))).map((part) =>
        fetchAllFiltered<{ id: string; assignment_id: string }>('assignment_items', (from, to) =>
          db.from('assignment_items').select('id, assignment_id').in('id', part).order('id').range(from, to)
        )
      )
    ),
  ])
  for (const part of submissionParts) {
    for (const s of part.rows) if (wanted.has(s.attempt_id) && sets.has(s.assignment_id)) links.set(s.attempt_id, s.assignment_id)
  }
  const itemSet = new Map<string, string>()
  for (const part of itemParts) for (const i of part.rows) itemSet.set(i.id, i.assignment_id)
  for (const a of attempts) {
    if (links.has(a.id) || !a.assignment_item_id) continue
    const setId = itemSet.get(a.assignment_item_id)
    if (setId && sets.has(setId)) links.set(a.id, setId)
  }
  return links
}

/** The teacher's latest decision on each script marked since `since` (their own rows, RLS). */
async function loadDecisions(
  db: SupabaseClient,
  teacherId: string,
  since: string | null
): Promise<Map<string, ReviewDecision>> {
  const out = new Map<string, ReviewDecision>()
  if (!since) return out
  const { rows } = await fetchAllFiltered<{ id: string; attempt_id: string; decision: ReviewDecision | null }>(
    'teacher_overrides',
    (from, to) =>
      db
        .from('teacher_overrides')
        .select('id, attempt_id, decision')
        .eq('teacher_id', teacherId)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
  )
  // Ascending, so the last row seen per attempt is the latest.
  for (const r of rows) out.set(r.attempt_id, r.decision ?? 'override')
  return out
}

/**
 * The inbox for one teacher and filter set: every matching script, scored and
 * sorted, plus the status counts. `withOptions` also returns what the filter
 * form lists (classes, their students by name, their sets).
 *
 * A class or set filter naming something that is not the teacher's is a 404
 * (the same answer for "missing" and "not yours"); a student filter naming
 * someone who is not their current student simply matches nothing.
 */
export async function loadReviewQueue(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  teacherId: string,
  filters: ReviewFilters,
  opts: { withOptions?: boolean; now?: Date } = {}
): Promise<ReviewQueueLoad> {
  const now = opts.now ?? new Date()
  const windowStart = new Date(now.getTime() - REVIEW_WINDOW_DAYS * DAY_MS).toISOString()

  const classes = await loadTeacherClasses(supabase, teacherId)
  const live = classes.filter((c) => !c.archived_at)

  let scope: ReviewClass[] = live
  if (filters.classroom_id) {
    const chosen = classes.find((c) => c.id === filters.classroom_id)
    if (!chosen) return { ok: false, status: 404, error: 'Classroom not found', field: 'classroom_id' }
    // An archived class's students are no longer the teacher's to review.
    scope = chosen.archived_at ? [] : [chosen]
  }

  let filterSet: SetRow | null = null
  if (filters.assignment_id) {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, classroom_id, title, is_mock, published_at, archived_at, created_at')
      .eq('id', filters.assignment_id)
      .eq('teacher_id', teacherId)
      .maybeSingle()
    if (error) throw new Error(`assignments: ${error.message}`)
    const row = data as SetRow | null
    if (!row || !classes.some((c) => c.id === row.classroom_id)) {
      return { ok: false, status: 404, error: 'Set not found', field: 'assignment_id' }
    }
    filterSet = row
    scope = scope.filter((c) => c.id === row.classroom_id)
  }

  // Classes whose students / sets the filter form lists.
  const optionClasses = filters.classroom_id ? classes.filter((c) => c.id === filters.classroom_id) : live
  const memberClassIds = unique([
    ...scope.map((c) => c.id),
    ...(opts.withOptions ? optionClasses.filter((c) => !c.archived_at).map((c) => c.id) : []),
  ])
  const members = await getMembersForClassrooms(supabase, memberClassIds, { status: ['active'] })

  // Students in scope, and the earliest moment each could have work in it.
  const lowerBound = new Map<string, string>()
  for (const c of scope) {
    for (const m of members.get(c.id) ?? []) {
      if (filters.student_id && m.student_id !== filters.student_id) continue
      const bound = laterIso(m.joined_at, windowStart)
      const had = lowerBound.get(m.student_id)
      if (!had || ms(bound) < ms(had)) lowerBound.set(m.student_id, bound)
    }
  }
  const studentIds = [...lowerBound.keys()]

  const { attempts, truncated } = await loadWindowAttempts(supabase, studentIds, lowerBound)

  let linked: ClassroomAttempt[] = []
  const links = new Map<string, string>()
  if (filterSet && scope.length > 0) {
    const inScope = new Set(studentIds)
    const extra = await loadSetAttempts(supabase, filterSet.id, new Set(attempts.map((a) => a.id)))
    linked = extra.attempts.filter((a) => inScope.has(a.user_id))
    for (const [id, setId] of extra.links) links.set(id, setId)
  }
  const all = [...attempts, ...linked]
  await attachSchemes(admin, all)

  // Sets: every set of the classes in view (for "Set work" and the form).
  const setClassIds = unique([...scope.map((c) => c.id), ...(opts.withOptions ? optionClasses.map((c) => c.id) : [])])
  const setRows: SetRow[] = []
  for (const part of chunk(setClassIds)) {
    const { rows } = await fetchAllFiltered<SetRow>('assignments', (from, to) =>
      supabase
        .from('assignments')
        .select('id, classroom_id, title, is_mock, published_at, archived_at, created_at')
        .in('classroom_id', part)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    )
    setRows.push(...rows)
  }
  const sets = new Map<string, ReviewSet>()
  for (const s of setRows) {
    if (!s.published_at || s.archived_at) continue
    sets.set(s.id, { id: s.id, classroom_id: s.classroom_id, title: s.title, is_mock: s.is_mock === true })
  }
  if (filterSet) {
    sets.set(filterSet.id, {
      id: filterSet.id,
      classroom_id: filterSet.classroom_id,
      title: filterSet.title,
      is_mock: filterSet.is_mock === true,
    })
  }

  let since: string | null = null
  for (const a of all) if (since === null || ms(a.created_at) < ms(since)) since = a.created_at

  const scopeSets = new Map([...sets].filter(([, s]) => scope.some((c) => c.id === s.classroom_id)))
  const [windowLinks, decisions] = await Promise.all([
    loadSetLinks(supabase, scopeSets, attempts),
    loadDecisions(supabase, teacherId, since),
  ])
  for (const [id, setId] of windowLinks) if (!links.has(id)) links.set(id, setId)

  const optionStudentIds = opts.withOptions
    ? unique(optionClasses.flatMap((c) => (members.get(c.id) ?? []).map((m) => m.student_id)))
    : []
  const names = await getStudentProfiles(supabase, unique([...all.map((a) => a.user_id), ...optionStudentIds]))
  const nameMap = new Map<string, string | null>([...names].map(([id, p]) => [id, p.full_name]))

  const { items, counts } = assembleReviewQueue({
    classes: scope,
    members,
    attempts,
    linked,
    links,
    sets,
    decisions,
    names: nameMap,
    filters,
  })

  let options: ReviewFilterOptions | null = null
  if (opts.withOptions) {
    const classOptions = live.map((c) => ({ id: c.id, name: c.name, archived: false }))
    const chosen = filters.classroom_id ? classes.find((c) => c.id === filters.classroom_id) : undefined
    if (chosen?.archived_at) classOptions.push({ id: chosen.id, name: chosen.name, archived: true })
    const classNames = new Map(classes.map((c) => [c.id, c.name]))
    const studentName = (id: string) => names.get(id)?.full_name?.trim() || displayName(null)
    options = {
      classes: classOptions,
      students: optionStudentIds
        .map((id) => ({ id, name: studentName(id) }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      // Newest first (the read order); a set older than these is still
      // filterable by URL and shows as "Selected set" in the form.
      sets: [...sets.values()]
        .filter((s) => optionClasses.some((c) => c.id === s.classroom_id))
        .slice(0, MAX_SET_OPTIONS)
        .map((s) => ({
          id: s.id,
          title: s.title,
          classroom_name: filters.classroom_id ? null : (classNames.get(s.classroom_id) ?? null),
        })),
    }
  }

  return {
    ok: true,
    items,
    counts,
    truncated,
    windowDays: REVIEW_WINDOW_DAYS,
    liveClassCount: live.length,
    options,
  }
}

// ---------------------------------------------------------------------------
// One script: scope check (every attempt route) and the review page
// ---------------------------------------------------------------------------

/** attempts columns the review routes read: the loader slice plus the full marking and the photos. */
const REVIEW_ATTEMPT_COLUMNS = `${attemptColumns(true)}, ai_marking, answer_photo_url, line_references, ocr_text`

export type ReviewAttemptRow = AttemptRow & {
  ai_marking: unknown
  answer_photo_url: string | null
  line_references: unknown
  ocr_text: string | null
}

export type ReviewScope = {
  row: ReviewAttemptRow
  /** The same script as the analytics loaders see it (scoping, priority). */
  attempt: ClassroomAttempt
  /** The class the script is reviewed in: its set's class, else the first (by name) that accepts it. */
  classroom: ReviewClass
  /** The teacher's live classes this student is an active member of. */
  memberClassIds: string[]
  set: ReviewSet | null
}

/**
 * Whether the calling teacher may review this script, and in which class —
 * null for "no" (404 at every call site: missing and not-yours look the same).
 *
 * The attempt read goes through RLS; on top of it the classroom rule applies
 * (active member of a live class of this teacher; marked since joining; in
 * the class's subject, or handed in against one of its sets), so a direct
 * link cannot open a student's work from before they joined or in another
 * subject.
 */
export async function resolveReviewScope(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  teacherId: string,
  attemptId: string
): Promise<ReviewScope | null> {
  if (!isUuid(attemptId)) return null
  const { data, error } = await supabase
    .from('attempts')
    .select(REVIEW_ATTEMPT_COLUMNS)
    .eq('id', attemptId.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`attempts: ${error.message}`)
  const row = data as ReviewAttemptRow | null
  if (!row) return null

  const classes = (await loadTeacherClasses(supabase, teacherId)).filter((c) => !c.archived_at)
  if (classes.length === 0) return null
  const { data: memberRows, error: memberError } = await supabase
    .from('classroom_memberships')
    .select('classroom_id, student_id, status, joined_at, left_at, removed_at')
    .eq('student_id', row.user_id)
    .eq('status', 'active')
    .in(
      'classroom_id',
      classes.map((c) => c.id)
    )
  if (memberError) throw new Error(`classroom_memberships: ${memberError.message}`)
  const memberships = (memberRows ?? []) as Array<ClassroomMember & { classroom_id: string }>
  if (memberships.length === 0) return null

  const attempt = toClassroomAttempt(row)
  await attachSchemes(admin, [attempt])

  // The set this script was handed in against, if it is one of these classes'.
  const [submissionRes, itemRes] = await Promise.all([
    supabase.from('assignment_submissions').select('assignment_id').eq('attempt_id', row.id).limit(5),
    row.assignment_item_id
      ? supabase.from('assignment_items').select('assignment_id').eq('id', row.assignment_item_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (submissionRes.error) throw new Error(`assignment_submissions: ${submissionRes.error.message}`)
  if (itemRes.error) throw new Error(`assignment_items: ${itemRes.error.message}`)
  const setIds = unique([
    ...((submissionRes.data ?? []) as Array<{ assignment_id: string }>).map((s) => s.assignment_id),
    (itemRes.data as { assignment_id: string } | null)?.assignment_id,
  ])
  let set: ReviewSet | null = null
  if (setIds.length > 0) {
    const { data: setRows, error: setError } = await supabase
      .from('assignments')
      .select('id, classroom_id, title, is_mock, published_at, archived_at')
      .in('id', setIds)
      .eq('teacher_id', teacherId)
    if (setError) throw new Error(`assignments: ${setError.message}`)
    const usable = ((setRows ?? []) as SetRow[]).find(
      (s) => Boolean(s.published_at) && !s.archived_at && memberships.some((m) => m.classroom_id === s.classroom_id)
    )
    if (usable) {
      set = { id: usable.id, classroom_id: usable.classroom_id, title: usable.title, is_mock: usable.is_mock === true }
    }
  }

  const memberClassIds = memberships.map((m) => m.classroom_id)
  const candidates = classes.filter((c) => memberClassIds.includes(c.id))
  // The set's class gets first claim, as in the queue.
  candidates.sort((a, b) => Number(b.id === set?.classroom_id) - Number(a.id === set?.classroom_id))
  for (const c of candidates) {
    const member = memberships.filter((m) => m.classroom_id === c.id)
    const inSubject = scopeClassroomAttempts([attempt], member, { subjectCode: c.subject_code }).length > 0
    const asSetWork =
      set?.classroom_id === c.id && scopeClassroomAttempts([attempt], member, { subjectCode: null }).length > 0
    if (inSubject || asSetWork) {
      return { row, attempt, classroom: c, memberClassIds, set: set?.classroom_id === c.id ? set : null }
    }
  }
  return null
}

export type ReviewMarkView = {
  mark_id: string | number
  type: string | null
  earned: boolean
  reasoning: string | null
  margin_note: string | null
  /** A teacher has already changed or re-confirmed this entry. */
  teacher_override: boolean
}

export type ReviewDecisionView = {
  id: string
  decision: ReviewDecision
  created_at: string
  override_total_earned: number | null
  reasoning_note: string | null
  student_visible: boolean
}

export type InkPage = { photo_url: string; line_references: unknown[] }

export type AttemptReview = {
  attempt: {
    id: string
    student_id: string
    created_at: string
    marks_earned: number | null
    total_marks: number | null
    /** The marker's own total (before any override), when it is known. */
    ai_marks_earned: number | null
    teacher_override: boolean
    question_text: string | null
    /** The student's typed or transcribed answer, shown when there is no photo. */
    answer_text: string | null
    summary: string | null
    marking: ScriptMarkingMode['mode']
    total_only_basis: Extract<ScriptMarkingMode, { mode: 'total_only' }>['basis'] | null
    marks: ReviewMarkView[]
    judgement: Array<{ label: string; value: string }>
  }
  student: { id: string; full_name: string | null; display_name: string }
  classroom: { id: string; name: string; subject_code: string | null }
  memberClassIds: string[]
  set: ReviewSet | null
  work_label: string | null
  ink: InkPage[]
  /** The calling teacher's decisions on this script, newest first. */
  decisions: ReviewDecisionView[]
  /** The calling teacher's notes on this script, newest first. */
  feedback: FeedbackNote[]
  /** Where this script sorts in a queue (no student baseline: close enough to place it). */
  order: ReviewOrderKey
}

/**
 * Everything the review page shows for one script, or null when the teacher
 * may not review it. Photos are signed by `signPhoto` (the caller passes
 * lib/storage/answer-photos signAnswerPhotoUrl) — every page of a multi-page
 * script from `ai_marking.ink_pages`, else the single `answer_photo_url`.
 */
export async function loadAttemptReview(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  teacherId: string,
  attemptId: string,
  deps: { signPhoto: (stored: string) => Promise<string | null> }
): Promise<AttemptReview | null> {
  const scope = await resolveReviewScope(supabase, admin, teacherId, attemptId)
  if (!scope) return null
  const { row, attempt } = scope
  const ai = isPlainObject(row.ai_marking) ? row.ai_marking : {}

  const [overrideRes, feedbackRes, names, ink] = await Promise.all([
    supabase
      .from('teacher_overrides')
      .select('id, decision, created_at, override_total_earned, reasoning_note, student_visible')
      .eq('attempt_id', row.id)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
    supabase
      .from('teacher_feedback')
      .select('id, body, created_at, read_at')
      .eq('attempt_id', row.id)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
    getStudentProfiles(supabase, [row.user_id]),
    signInk(row, ai, deps.signPhoto),
  ])
  if (overrideRes.error) throw new Error(`teacher_overrides: ${overrideRes.error.message}`)
  if (feedbackRes.error) throw new Error(`teacher_feedback: ${feedbackRes.error.message}`)

  const decisions: ReviewDecisionView[] = (
    (overrideRes.data ?? []) as Array<{
      id: string
      decision: ReviewDecision | null
      created_at: string
      override_total_earned: number | string | null
      reasoning_note: string | null
      student_visible: boolean | null
    }>
  ).map((d) => ({
    id: d.id,
    decision: d.decision ?? 'override',
    created_at: d.created_at,
    override_total_earned: num(d.override_total_earned),
    reasoning_note: d.reasoning_note ?? null,
    student_visible: d.student_visible !== false,
  }))

  const mode = scriptMarkingMode(ai)
  const marks: ReviewMarkView[] =
    mode.mode === 'per_mark'
      ? mode.marks.map((m) => ({
          mark_id: m.mark_id as string | number,
          type: typeof m.type === 'string' ? m.type : null,
          earned: m.earned === true,
          reasoning: typeof m.reasoning === 'string' && m.reasoning.trim() ? m.reasoning : null,
          margin_note: typeof m.margin_note === 'string' && m.margin_note.trim() ? m.margin_note : null,
          teacher_override: m.teacher_override === true,
        }))
      : []

  const marksEarned = num(row.marks_earned)
  const teacherOverride = ai.teacher_override === true
  const fullName = names.get(row.user_id)?.full_name ?? null
  const latest = decisions[0]?.decision ?? null
  const { priority } = scoreReviewPriority({
    marks_earned: attempt.marks_earned,
    total_marks: attempt.total_marks,
    ai_marking: attempt.ai_marking ?? null,
    error_classifications: attempt.error_classifications ?? null,
    decision: latest,
    assignment: scope.set ? { is_mock: scope.set.is_mock } : null,
    letter_grades: letterGradesFor(scope.classroom),
  })

  return {
    attempt: {
      id: row.id,
      student_id: row.user_id,
      created_at: row.created_at,
      marks_earned: marksEarned,
      total_marks: num(row.total_marks),
      ai_marks_earned: num(ai.original_marks_earned) ?? (teacherOverride ? null : marksEarned),
      teacher_override: teacherOverride,
      question_text: typeof row.question_text === 'string' && row.question_text.trim() ? row.question_text : null,
      answer_text: typeof row.ocr_text === 'string' && row.ocr_text.trim() ? row.ocr_text : null,
      summary: typeof ai.summary === 'string' && ai.summary.trim() ? ai.summary : null,
      marking: mode.mode,
      total_only_basis: mode.mode === 'total_only' ? mode.basis : null,
      marks,
      judgement: mode.mode === 'total_only' ? aiJudgementSummary(ai) : [],
    },
    student: { id: row.user_id, full_name: fullName?.trim() || null, display_name: displayName(fullName) },
    classroom: { id: scope.classroom.id, name: scope.classroom.name, subject_code: scope.classroom.subject_code },
    memberClassIds: scope.memberClassIds,
    set: scope.set,
    work_label: reviewWorkLabel({
      setTitle: scope.set?.title ?? null,
      paperCode: attempt.mark_schemes?.paper_code ?? attempt.ai_marking?.paper_code ?? null,
      questionNumber: attempt.mark_schemes?.question_number ?? null,
    }),
    ink,
    decisions,
    feedback: ((feedbackRes.data ?? []) as FeedbackNote[]).map((f) => ({
      id: f.id,
      body: f.body,
      created_at: f.created_at,
      read_at: f.read_at ?? null,
    })),
    order: { priority, created_at: row.created_at, attempt_id: row.id },
  }
}

/** Signed photo pages with their ink, or [] when the script has no photo. */
async function signInk(
  row: ReviewAttemptRow,
  ai: Record<string, unknown>,
  signPhoto: (stored: string) => Promise<string | null>
): Promise<InkPage[]> {
  const stored = Array.isArray(ai.ink_pages) ? ai.ink_pages.filter(isPlainObject) : []
  if (stored.length > 0) {
    const pages = await Promise.all(
      stored.map(async (p) => {
        const url = typeof p.photo_url === 'string' ? await signPhoto(p.photo_url) : null
        return url
          ? { photo_url: url, line_references: Array.isArray(p.line_references) ? p.line_references : [] }
          : null
      })
    )
    const signed = pages.filter((p): p is InkPage => p !== null)
    if (signed.length > 0) return signed
  }
  if (typeof row.answer_photo_url === 'string' && row.answer_photo_url) {
    const url = await signPhoto(row.answer_photo_url)
    if (url) return [{ photo_url: url, line_references: Array.isArray(row.line_references) ? row.line_references : [] }]
  }
  return []
}
