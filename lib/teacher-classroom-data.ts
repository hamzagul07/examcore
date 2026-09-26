import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  scopeClassroomAttempts,
  type ClassroomAiMarking,
  type ClassroomAttempt,
  type ClassroomAttemptScheme,
  type ClassroomMarkPoint,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import type {
  Assignment,
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  MembershipStatus,
} from '@/lib/teacher/types'
import type { ErrorClassificationDetail } from '@/lib/error-classifications'

/**
 * Classroom reads for the teacher system (docs/TEACHER_SYSTEM_SPEC.md §2.4).
 *
 * Callers prove ownership first (verifyTeacherOwnsClassroom) and pass the
 * client they read with: the teacher's own RLS client normally, the service
 * client only after ownership is proven and only where RLS would hide rows the
 * teacher is entitled to (an archived class's retained hand-ins). The loaders
 * do not rely on RLS for the classroom privacy rule — they apply it
 * themselves (active members, marked since joining, classroom subject), so it
 * holds whichever client is passed.
 *
 * Every cohort read pages through its rows. PostgREST caps a response at
 * 1,000 rows and says nothing when it does (lib/supabase/fetch-all.ts has the
 * history); `fetchAllRows` there cannot take filters, so `fetchAllFiltered`
 * below is the same loop over a filtered, deterministically ordered query.
 * Id lists are chunked so a large roster never builds an oversized URL.
 */

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

/**
 * What a Supabase query resolves to, loosely: row types come from the
 * caller's `T` (as with fetchAllRows), because select strings built at run
 * time defeat supabase-js's type-level select parser.
 */
export type PageResult = { data: unknown; error: { message: string } | null }

/** One page: rows [from, to] of a query that MUST have a stable order. */
export type PageQuery = (from: number, to: number) => PromiseLike<PageResult>

/**
 * PostgREST's default max-rows. A page is never asked for more: a server that
 * silently returned 1,000 of a requested 2,000 would look like the last page.
 */
export const PAGE_SIZE = 1000
/** Ids per `.in()` filter — keeps request URLs well under proxy limits. */
export const ID_CHUNK = 100

/**
 * Every row a filtered query matches, page by page, or the first `maxRows`
 * of them.
 *
 * `truncated` is exact: one row past `maxRows` is requested, so it is true
 * only when more rows really exist. Throws on a query error rather than
 * returning what it had — a partial cohort presented as a whole one is the
 * failure this exists to prevent.
 */
export async function fetchAllFiltered<T>(
  label: string,
  page: PageQuery,
  opts: { pageSize?: number; maxRows?: number } = {}
): Promise<{ rows: T[]; truncated: boolean }> {
  const pageSize = Math.min(PAGE_SIZE, Math.max(1, Math.floor(opts.pageSize ?? PAGE_SIZE)))
  const maxRows =
    opts.maxRows === undefined ? Infinity : Math.max(0, Math.floor(opts.maxRows))
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    // Ask for one row beyond the cap so "exactly maxRows exist" is not
    // mistaken for "more exist".
    const want = Math.min(pageSize, maxRows + 1 - from)
    if (want <= 0) break
    const { data, error } = await page(from, from + want - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    const batch = (Array.isArray(data) ? data : []) as T[]
    rows.push(...batch)
    if (batch.length < want) break
  }
  if (rows.length > maxRows) return { rows: rows.slice(0, maxRows), truncated: true }
  return { rows, truncated: false }
}

export function chunk<T>(items: readonly T[], size = ID_CHUNK): T[][] {
  const step = Math.max(1, Math.floor(size) || 1)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += step) out.push(items.slice(i, i + step))
  return out
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))]
}

// ---------------------------------------------------------------------------
// Classroom + members
// ---------------------------------------------------------------------------

export type ClassroomScopeRow = {
  id: string
  teacher_id: string
  name: string
  board: string | null
  level: string | null
  subject_code: string | null
  archived_at: string | null
}

/** The classroom row the loaders scope by, or null when the client cannot see it. */
export async function getClassroomScope(
  supabase: SupabaseClient,
  classroomId: string
): Promise<ClassroomScopeRow | null> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, teacher_id, name, board, level, subject_code, archived_at')
    .eq('id', classroomId)
    .maybeSingle()
  if (error) throw new Error(`classrooms: ${error.message}`)
  return (data as ClassroomScopeRow | null) ?? null
}

const MEMBER_COLUMNS = 'classroom_id, student_id, status, joined_at, left_at, removed_at'

type MemberRow = ClassroomMember & { classroom_id: string }

/**
 * Membership rows for one or more classrooms. `status` defaults to every
 * status — callers that mean "the class now" pass `['active']`.
 */
export async function getMembersForClassrooms(
  supabase: SupabaseClient,
  classroomIds: readonly string[],
  opts: { status?: MembershipStatus[] } = {}
): Promise<Map<string, ClassroomMember[]>> {
  const out = new Map<string, ClassroomMember[]>()
  const ids = unique(classroomIds)
  for (const id of ids) out.set(id, [])
  for (const part of chunk(ids)) {
    const { rows } = await fetchAllFiltered<MemberRow>('classroom_memberships', (from, to) => {
      let q = supabase.from('classroom_memberships').select(MEMBER_COLUMNS).in('classroom_id', part)
      if (opts.status?.length) q = q.in('status', opts.status)
      return q.order('classroom_id').order('student_id').range(from, to)
    })
    for (const r of rows) {
      out.get(r.classroom_id)?.push({
        student_id: r.student_id,
        status: r.status,
        joined_at: r.joined_at,
        left_at: r.left_at ?? null,
        removed_at: r.removed_at ?? null,
      })
    }
  }
  return out
}

export async function getClassroomMembers(
  supabase: SupabaseClient,
  classroomId: string,
  opts: { status?: MembershipStatus[] } = {}
): Promise<ClassroomMember[]> {
  const byClass = await getMembersForClassrooms(supabase, [classroomId], opts)
  return byClass.get(classroomId) ?? []
}

/**
 * Student ids of a classroom's members — ACTIVE members by default, because
 * a student who left or was removed is no longer the teacher's to analyse
 * (spec §8). Pass `status` to include others, e.g. a roster with LEFT chips.
 */
export async function getClassroomStudentIds(
  supabase: SupabaseClient,
  classroomId: string,
  opts: { status?: MembershipStatus[] } = {}
): Promise<string[]> {
  const members = await getClassroomMembers(supabase, classroomId, {
    status: opts.status?.length ? opts.status : ['active'],
  })
  return members.map((m) => m.student_id)
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

/**
 * Only the JSON paths of `ai_marking` analytics reads (see ClassroomAiMarking).
 * `mark_schemes` resolves under the service client and comes back null under
 * a teacher's RLS client; `getClassroomAttempts({ admin })` fills it then.
 */
const ATTEMPT_COLUMNS = [
  'id',
  'user_id',
  'marks_earned',
  'total_marks',
  'syllabus_tags',
  'created_at',
  'time_spent_seconds',
  'question_text',
  'source_type',
  'mark_scheme_id',
  'assignment_item_id',
  'am_paper_code:ai_marking->>paper_code',
  'am_paper_session:ai_marking->>paper_session',
  'am_style:ai_marking->>marking_style',
  'am_total_source:ai_marking->>total_marks_source',
  'am_guide_status:ai_marking->guide_notice->>status',
  'am_teacher_override:ai_marking->>teacher_override',
  // Presence probes: one scalar each instead of the band / criteria text.
  'am_band_level:ai_marking->band_result->>level',
  'am_first_criterion:ai_marking->criteria_results->0->>criterion',
  'mark_schemes ( paper_code, paper_session, question_number )',
].join(', ')

/** Per-mark detail: large, so only read by callers that use it. */
const MARKING_COLUMNS = ['error_classifications', 'am_marks:ai_marking->marks_awarded'].join(', ')

export function attemptColumns(withMarking: boolean): string {
  return withMarking ? `${ATTEMPT_COLUMNS}, ${MARKING_COLUMNS}` : ATTEMPT_COLUMNS
}

/** A row as PostgREST returns it for `attemptColumns()`. */
export type AttemptRow = {
  id: string
  user_id: string
  marks_earned: number | string | null
  total_marks: number | string | null
  syllabus_tags: string[] | null
  created_at: string
  time_spent_seconds?: number | string | null
  question_text?: string | null
  source_type?: string | null
  mark_scheme_id?: string | null
  assignment_item_id?: string | null
  am_paper_code?: string | null
  am_paper_session?: string | null
  am_style?: string | null
  am_total_source?: string | null
  am_guide_status?: string | null
  am_teacher_override?: string | boolean | null
  am_band_level?: string | number | null
  am_first_criterion?: string | null
  mark_schemes?: ClassroomAttemptScheme | ClassroomAttemptScheme[] | null
  error_classifications?: ErrorClassificationDetail[] | null
  am_marks?: unknown
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function markPoints(value: unknown): ClassroomMarkPoint[] | null {
  if (!Array.isArray(value)) return null
  const out: ClassroomMarkPoint[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const p = entry as Record<string, unknown>
    out.push({
      mark_id:
        typeof p.mark_id === 'string' || typeof p.mark_id === 'number' ? p.mark_id : null,
      type: text(p.type),
      earned: typeof p.earned === 'boolean' ? p.earned : null,
      margin_note: text(p.margin_note),
      error_classification: text(p.error_classification),
      teacher_override: p.teacher_override === true ? true : null,
    })
  }
  return out
}

/** Row → ClassroomAttempt: reassembles the ai_marking slice, unwraps the embed. */
export function toClassroomAttempt(row: AttemptRow): ClassroomAttempt {
  const embed = Array.isArray(row.mark_schemes) ? row.mark_schemes[0] ?? null : row.mark_schemes ?? null
  const aiMarking: ClassroomAiMarking = {
    paper_code: text(row.am_paper_code),
    paper_session: text(row.am_paper_session),
    marking_style: text(row.am_style),
    total_marks_source: text(row.am_total_source),
    guide_notice: text(row.am_guide_status) ? { status: text(row.am_guide_status) } : null,
    teacher_override: row.am_teacher_override === true || row.am_teacher_override === 'true',
    judgement_marking:
      (row.am_band_level !== null && row.am_band_level !== undefined && row.am_band_level !== '') ||
      text(row.am_first_criterion) !== null,
  }
  if ('am_marks' in row) aiMarking.marks_awarded = markPoints(row.am_marks)

  const earned = num(row.marks_earned)
  const attempt: ClassroomAttempt = {
    id: row.id,
    user_id: row.user_id,
    // A NULL mark or total means "no percentage" (a whole paper still being
    // marked, say). Both become a zero total, which every consumer skips
    // (usableMarks); a NULL mark over a real total must not read as 0%.
    marks_earned: earned ?? 0,
    total_marks: earned === null ? 0 : (num(row.total_marks) ?? 0),
    syllabus_tags: Array.isArray(row.syllabus_tags)
      ? row.syllabus_tags.filter((t): t is string => typeof t === 'string')
      : null,
    created_at: row.created_at,
    time_spent_seconds: num(row.time_spent_seconds),
    question_text: row.question_text ?? null,
    source_type: row.source_type ?? null,
    mark_scheme_id: row.mark_scheme_id ?? null,
    assignment_item_id: row.assignment_item_id ?? null,
    ai_marking: aiMarking,
    mark_schemes: embed,
  }
  if ('error_classifications' in row) {
    attempt.error_classifications = Array.isArray(row.error_classifications)
      ? row.error_classifications
      : null
  }
  return attempt
}

export const DEFAULT_ATTEMPT_LIMIT = 5000
export const MAX_ATTEMPT_LIMIT = 20000

function laterIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

/**
 * Raw attempt rows for a set of students, newest first, NOT yet scoped to a
 * classroom (use getClassroomAttempts, or scopeClassroomAttempts on these).
 * `lowerBound` / `upperBound` are pushed into the query; per-student join
 * dates are applied by the scope filter afterwards.
 */
export async function loadAttemptRows(
  db: SupabaseClient,
  studentIds: readonly string[],
  opts: {
    lowerBound?: ReadonlyMap<string, string> | string | null
    upperBound?: string | null
    limit?: number
    withMarking?: boolean
  } = {}
): Promise<{ attempts: ClassroomAttempt[]; truncated: boolean }> {
  const ids = unique(studentIds)
  if (ids.length === 0) return { attempts: [], truncated: false }
  const limit = Math.min(
    MAX_ATTEMPT_LIMIT,
    Math.max(1, Math.floor(opts.limit ?? DEFAULT_ATTEMPT_LIMIT))
  )
  const columns = attemptColumns(opts.withMarking !== false)

  const all: ClassroomAttempt[] = []
  let truncated = false
  for (const part of chunk(ids)) {
    // The loosest lower bound any student in this chunk needs.
    let lower: string | null = null
    if (typeof opts.lowerBound === 'string') lower = opts.lowerBound
    else if (opts.lowerBound) {
      let earliest: string | null = null
      let unbounded = false
      for (const id of part) {
        const bound = opts.lowerBound.get(id)
        if (!bound) {
          unbounded = true
          break
        }
        if (earliest === null || Date.parse(bound) < Date.parse(earliest)) earliest = bound
      }
      lower = unbounded ? null : earliest
    }

    const result = await fetchAllFiltered<AttemptRow>(
      'attempts',
      (from, to) => {
        let q = db.from('attempts').select(columns).in('user_id', part)
        if (lower) q = q.gte('created_at', lower)
        if (opts.upperBound) q = q.lte('created_at', opts.upperBound)
        return q
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)
      },
      { maxRows: limit }
    )
    if (result.truncated) truncated = true
    for (const row of result.rows) all.push(toClassroomAttempt(row))
  }

  all.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))
  if (all.length > limit) {
    truncated = true
    all.length = limit
  }
  return { attempts: all, truncated }
}

/**
 * Fill `mark_schemes` from a client that can read them (the service client),
 * for attempts whose embed came back empty under RLS. Only paper / session /
 * question number are read — never scheme text.
 */
export async function attachSchemes(
  admin: SupabaseClient,
  attempts: ClassroomAttempt[]
): Promise<void> {
  const missing = unique(
    attempts.filter((a) => a.mark_scheme_id && !a.mark_schemes).map((a) => a.mark_scheme_id as string)
  )
  if (missing.length === 0) return
  const byId = new Map<string, ClassroomAttemptScheme>()
  for (const part of chunk(missing)) {
    const { rows } = await fetchAllFiltered<ClassroomAttemptScheme & { id: string }>(
      'mark_schemes',
      (from, to) =>
        admin
          .from('mark_schemes')
          .select('id, paper_code, paper_session, question_number')
          .in('id', part)
          .order('id')
          .range(from, to)
    )
    for (const r of rows) {
      byId.set(r.id, {
        paper_code: r.paper_code ?? null,
        paper_session: r.paper_session ?? null,
        question_number: r.question_number ?? null,
      })
    }
  }
  for (const a of attempts) {
    if (!a.mark_schemes && a.mark_scheme_id) a.mark_schemes = byId.get(a.mark_scheme_id) ?? null
  }
}

export type ClassroomAttemptsOptions = {
  /**
   * The classroom's subject. Omit to use `classrooms.subject_code`; pass null
   * for "no subject filter" (a class whose subject is not set yet).
   */
  subjectCode?: string | null
  /** Drop work marked before each student joined (default true — spec §8). */
  sinceJoin?: boolean
  /** Inclusive ISO lower bound on created_at. */
  since?: string
  /** Inclusive ISO upper bound on created_at. */
  until?: string
  /** Max attempts read, newest first (default 5,000, capped at 20,000). */
  limit?: number
  /**
   * Read per-mark detail (`error_classifications`, `ai_marking.marks_awarded`).
   * Default true; topic, quadrant and summary reads should pass false.
   */
  withMarking?: boolean
  /**
   * A client that can read mark_schemes (service role, after ownership is
   * proven). With it, past-paper attempts are placed in a subject by their
   * paper code rather than by their tags.
   */
  admin?: SupabaseClient
}

/**
 * A classroom's attempts under the classroom privacy rule: active members
 * only, marked at or after the moment each joined, in the classroom's subject
 * (see scopeClassroomAttempts). Newest first.
 *
 * `truncated` is true when older rows existed past `limit`; say so in the UI
 * rather than presenting a partial class as the whole of it. `studentIds` are
 * the active members the read was scoped to — the roster denominator that
 * goes with these attempts.
 */
export async function getClassroomAttempts(
  supabase: SupabaseClient,
  classroomId: string,
  opts: ClassroomAttemptsOptions = {}
): Promise<{ attempts: ClassroomAttempt[]; truncated: boolean; studentIds: string[] }> {
  let subjectCode = opts.subjectCode
  if (subjectCode === undefined) {
    const classroom = await getClassroomScope(supabase, classroomId)
    if (!classroom) return { attempts: [], truncated: false, studentIds: [] }
    subjectCode = classroom.subject_code
  }

  const members = await getClassroomMembers(supabase, classroomId, { status: ['active'] })
  const studentIds = members.map((m) => m.student_id)
  if (members.length === 0) return { attempts: [], truncated: false, studentIds }

  const sinceJoin = opts.sinceJoin !== false
  const lowerBound = new Map<string, string>()
  for (const m of members) {
    const bound = laterIso(sinceJoin ? m.joined_at : null, opts.since ?? null)
    if (bound) lowerBound.set(m.student_id, bound)
  }

  const { attempts, truncated } = await loadAttemptRows(supabase, studentIds, {
    lowerBound,
    upperBound: opts.until ?? null,
    limit: opts.limit,
    withMarking: opts.withMarking,
  })
  if (opts.admin) await attachSchemes(opts.admin, attempts)

  return {
    attempts: scopeClassroomAttempts(attempts, members, {
      subjectCode: subjectCode ?? null,
      sinceJoin,
      since: opts.since ?? null,
      until: opts.until ?? null,
    }),
    truncated,
    studentIds,
  }
}

/**
 * Specific attempts by id (e.g. the ones a set's hand-ins point at), with
 * per-mark detail by default. Scope them with scopeClassroomAttempts if the
 * ids did not come from an already-scoped source.
 */
export async function loadAttemptsByIds(
  db: SupabaseClient,
  attemptIds: readonly string[],
  opts: { withMarking?: boolean } = {}
): Promise<ClassroomAttempt[]> {
  const ids = unique(attemptIds)
  const columns = attemptColumns(opts.withMarking !== false)
  const out: ClassroomAttempt[] = []
  for (const part of chunk(ids)) {
    const { rows } = await fetchAllFiltered<AttemptRow>('attempts', (from, to) =>
      db.from('attempts').select(columns).in('id', part).order('id').range(from, to)
    )
    for (const r of rows) out.push(toClassroomAttempt(r))
  }
  return out
}

// ---------------------------------------------------------------------------
// Names — only through the SECURITY DEFINER RPCs (spec §8)
// ---------------------------------------------------------------------------

export type StudentProfile = { full_name: string | null; board: string | null; level: string | null }

const PROFILE_CHUNK = 500

/**
 * Names (and board / level) of the caller's CURRENT students, via
 * `teacher_student_profiles` — the only cross-user profile read a teacher
 * has. Ids that are not the caller's active students (left, removed, an
 * archived class, someone else's) are simply absent from the map; name them
 * with getRosterProfiles instead. Throws if the RPC fails, so a missing
 * grant surfaces as an error rather than a class of "Student"s.
 */
export async function getStudentProfiles(
  supabase: SupabaseClient,
  studentIds: readonly string[]
): Promise<Map<string, StudentProfile>> {
  const out = new Map<string, StudentProfile>()
  for (const part of chunk(unique(studentIds), PROFILE_CHUNK)) {
    const { data, error } = await supabase.rpc('teacher_student_profiles', { p_student_ids: part })
    if (error) throw new Error(`teacher_student_profiles: ${error.message}`)
    for (const row of (data ?? []) as Array<{ id: string } & Partial<StudentProfile>>) {
      out.set(row.id, {
        full_name: row.full_name ?? null,
        board: row.board ?? null,
        level: row.level ?? null,
      })
    }
  }
  return out
}

export type RosterProfile = StudentProfile & {
  id: string
  joined_at: string
  status: MembershipStatus
}

/**
 * Every member of one classroom with their name, whatever their status and
 * whether or not the class is archived, via `teacher_roster_profiles`.
 */
export async function getRosterProfiles(
  supabase: SupabaseClient,
  classroomId: string
): Promise<RosterProfile[]> {
  const { rows } = await fetchAllFiltered<RosterProfile>('teacher_roster_profiles', (from, to) =>
    supabase
      .rpc('teacher_roster_profiles', { p_classroom_id: classroomId })
      .order('id')
      .range(from, to)
  )
  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name ?? null,
    board: r.board ?? null,
    level: r.level ?? null,
    joined_at: r.joined_at,
    status: r.status,
  }))
}

// ---------------------------------------------------------------------------
// Sets (assignments) with what their progress is computed from
// ---------------------------------------------------------------------------

export type SetRow = Pick<
  Assignment,
  | 'id'
  | 'classroom_id'
  | 'title'
  | 'kind'
  | 'subject_code'
  | 'is_mock'
  | 'target'
  | 'due_at'
  | 'published_at'
  | 'closed_at'
  | 'archived_at'
  | 'created_at'
>

/** A published set plus the rows its per-student progress is derived from. */
export type ClassSet = SetRow & {
  items: AssignmentItem[]
  /** assignment_students rows: targeting plus per-student excuse / extension. */
  flags: AssignmentStudentFlags[]
  submissions: AssignmentSubmission[]
}

const SET_COLUMNS =
  'id, classroom_id, title, kind, subject_code, is_mock, target, due_at, published_at, closed_at, archived_at, created_at'
const ITEM_COLUMNS =
  'id, assignment_id, position, item_type, mark_scheme_id, paper_code, paper_session, question_number, total_marks, syllabus_tags, topic_code, prompt_text, ib_component_key'
const FLAG_COLUMNS =
  'assignment_id, student_id, excused_at, extended_due_at, feedback, feedback_at, reminded_at'
const SUBMISSION_COLUMNS =
  'id, assignment_id, item_id, student_id, attempt_id, attempt_count, marks_earned, total_marks, status, source, first_submitted_at, last_submitted_at'

/** Published, non-archived sets of the given classrooms (drafts are the teacher's scratchpad). */
export async function loadPublishedSets(
  db: SupabaseClient,
  classroomIds: readonly string[]
): Promise<SetRow[]> {
  const out: SetRow[] = []
  for (const part of chunk(unique(classroomIds))) {
    const { rows } = await fetchAllFiltered<SetRow>('assignments', (from, to) =>
      db
        .from('assignments')
        .select(SET_COLUMNS)
        .in('classroom_id', part)
        .not('published_at', 'is', null)
        .is('archived_at', null)
        .order('id')
        .range(from, to)
    )
    out.push(...rows)
  }
  return out
}

/**
 * Items, flags and hand-ins for the given sets. Under a teacher's RLS client,
 * hand-ins of students who are no longer active members are not returned
 * (the policy fails closed on them); read with the service client, after
 * proving ownership, where retained hand-ins must show (an archived class).
 */
export async function hydrateSets(
  db: SupabaseClient,
  sets: readonly SetRow[]
): Promise<ClassSet[]> {
  const ids = unique(sets.map((s) => s.id))
  const items = new Map<string, AssignmentItem[]>()
  const flags = new Map<string, AssignmentStudentFlags[]>()
  const submissions = new Map<string, AssignmentSubmission[]>()
  for (const id of ids) {
    items.set(id, [])
    flags.set(id, [])
    submissions.set(id, [])
  }

  for (const part of chunk(ids)) {
    const [itemRows, flagRows, submissionRows] = await Promise.all([
      fetchAllFiltered<AssignmentItem>('assignment_items', (from, to) =>
        db
          .from('assignment_items')
          .select(ITEM_COLUMNS)
          .in('assignment_id', part)
          .order('assignment_id')
          .order('position')
          .range(from, to)
      ),
      fetchAllFiltered<AssignmentStudentFlags>('assignment_students', (from, to) =>
        db
          .from('assignment_students')
          .select(FLAG_COLUMNS)
          .in('assignment_id', part)
          .order('assignment_id')
          .order('student_id')
          .range(from, to)
      ),
      fetchAllFiltered<AssignmentSubmission>('assignment_submissions', (from, to) =>
        db
          .from('assignment_submissions')
          .select(SUBMISSION_COLUMNS)
          .in('assignment_id', part)
          .order('id')
          .range(from, to)
      ),
    ])
    for (const r of itemRows.rows) items.get(r.assignment_id)?.push(r)
    for (const r of flagRows.rows) flags.get(r.assignment_id)?.push(r)
    for (const r of submissionRows.rows) {
      submissions.get(r.assignment_id)?.push({
        ...r,
        marks_earned: num(r.marks_earned),
        total_marks: num(r.total_marks),
      })
    }
  }

  return sets.map((s) => ({
    ...s,
    items: (items.get(s.id) ?? []).map((i) => ({ ...i, total_marks: num(i.total_marks) })),
    flags: flags.get(s.id) ?? [],
    submissions: submissions.get(s.id) ?? [],
  }))
}

/**
 * How many hand-ins on the given sets match. `unreviewed`: an attempt is
 * attached and no teacher has confirmed or re-marked it (status is not
 * 'reviewed'; a flag leaves it unreviewed on purpose). `firstFrom`/`firstTo`
 * bound first_submitted_at, [from, to). Under a teacher's RLS client, only
 * current students' hand-ins are counted.
 */
export async function countSubmissions(
  db: SupabaseClient,
  setIds: readonly string[],
  filter: { unreviewed?: boolean; firstFrom?: string; firstTo?: string } = {}
): Promise<number> {
  let total = 0
  for (const part of chunk(unique(setIds))) {
    let q = db
      .from('assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .in('assignment_id', part)
    if (filter.unreviewed) q = q.neq('status', 'reviewed').not('attempt_id', 'is', null)
    if (filter.firstFrom) q = q.gte('first_submitted_at', filter.firstFrom)
    if (filter.firstTo) q = q.lt('first_submitted_at', filter.firstTo)
    const { count, error } = await q
    if (error) throw new Error(`assignment_submissions: ${error.message}`)
    total += count ?? 0
  }
  return total
}
