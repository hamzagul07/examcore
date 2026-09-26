import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { classBonusFor } from '@/lib/billing/teacher-seat'
import { getSyllabusSubjectName } from '@/lib/syllabi'
import { chunk, fetchAllFiltered, type PageQuery } from '@/lib/teacher-classroom-data'
import { effectiveDueAt, studentAssignmentStatus } from '@/lib/teacher/assignment-status'
import { questionPreview } from '@/lib/teacher/assignments/resolve-items'
import { displayName } from '@/lib/teacher/display-name'
import { isTeacherV2 } from '@/lib/teacher/flags'
import type {
  Assignment,
  AssignmentItem,
  AssignmentSubmission,
  ClassroomSettings,
  MembershipStatus,
  TeacherFeedback,
} from '@/lib/teacher/types'
import { FALLBACK_TIME_ZONE, safeTimeZone } from '@/components/teacher/assignments/format'
import {
  DONE_PAGE_SIZE,
  buildStudentSetItems,
  canHandIn,
  classAverageAllowed,
  classAveragePct,
  decodeDoneCursor,
  deriveStudentAssignment,
  exportableAuditDetails,
  pageDoneSets,
  sortOpenSets,
  studentSubmissionStatus,
  summariseTeacherReview,
  visibleToStudent,
  type StudentAssignment,
  type StudentFlags,
  type StudentSetItem,
  type StudentSetRow,
  type TeacherReviewRow,
  type TeacherReviewSummary,
} from '@/lib/student/assignment-state'

export * from '@/lib/student/assignment-state'

/**
 * Loaders for everything a student sees of the teacher system
 * (docs/TEACHER_SYSTEM_SPEC.md §3 student routes, §4 student surfaces, §8).
 *
 * The privacy rule — a student sees their own work and nothing of anyone
 * else's — is held by the database first: every read of sets, items, hand-ins,
 * flags, feedback and decisions goes through the student's own RLS client
 * (`supabase`), so a set they are not a member of, a class they left, or a
 * decision their teacher kept private is simply not returned. The service
 * client (`admin`) is used only after an RLS read has proven the student may
 * see the thing, and only for what RLS deliberately does not expose to them:
 *
 *   - the teacher's name, shortened by displayName() ("Amira K.");
 *   - the start of a banked question (never its mark scheme);
 *   - the class average — one aggregate, only when the class allows it and
 *     only over CLASS_AVERAGE_MIN_STUDENTS or more students.
 *
 * No other student's id, name or mark is ever part of a return value here.
 * Everything is dark (empty / null) with TEACHER_V2=0.
 */

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const SET_COLUMNS = 'id, classroom_id, title, kind, is_mock, due_at, published_at, closed_at, archived_at, settings'
const DETAIL_SET_COLUMNS = `${SET_COLUMNS}, instructions, subject_code`
const ITEM_COLUMNS =
  'id, assignment_id, position, item_type, mark_scheme_id, paper_code, paper_session, question_number, total_marks, syllabus_tags, topic_code, prompt_text, ib_component_key'
const SUBMISSION_COLUMNS =
  'id, assignment_id, item_id, student_id, attempt_id, attempt_count, marks_earned, total_marks, status, source, first_submitted_at, last_submitted_at'
const FLAG_COLUMNS = 'assignment_id, excused_at, extended_due_at, feedback, feedback_at'
const CLASSROOM_COLUMNS = 'id, name, teacher_id, subject, subject_code, level, settings'

/** A student's own rows are far below this; it only bounds a runaway read. */
const MAX_OWN_ROWS = 10_000

/** The done list's largest page. */
export const MAX_DONE_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** A request the caller got wrong (a malformed cursor): the route answers 400 with `field`. */
export class StudentInputError extends Error {
  readonly field: string
  constructor(message: string, field: string) {
    super(message)
    this.name = 'StudentInputError'
    this.field = field
  }
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function plainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function toSetRow(row: Record<string, unknown>): StudentSetRow {
  const settings = plainObject(row.settings) ?? {}
  return {
    ...(row as unknown as StudentSetRow),
    is_mock: row.is_mock === true,
    settings: {
      timed_minutes: typeof settings.timed_minutes === 'number' ? settings.timed_minutes : undefined,
      allow_late: typeof settings.allow_late === 'boolean' ? settings.allow_late : undefined,
    },
  }
}

function toItem(row: Record<string, unknown>): AssignmentItem {
  return { ...(row as unknown as AssignmentItem), total_marks: num(row.total_marks) }
}

function toSubmission(row: Record<string, unknown>): AssignmentSubmission {
  return {
    ...(row as unknown as AssignmentSubmission),
    marks_earned: num(row.marks_earned),
    total_marks: num(row.total_marks),
    attempt_count: num(row.attempt_count) ?? 1,
  }
}

function toSettings(value: unknown): ClassroomSettings {
  const s = plainObject(value) ?? {}
  return {
    notify_submissions: s.notify_submissions === 'off' ? 'off' : s.notify_submissions === 'daily' ? 'daily' : undefined,
    demo: s.demo === true ? true : undefined,
    student_can_see_class_avg: s.student_can_see_class_avg === true,
  }
}

type ClassroomRow = {
  id: string
  name: string
  teacher_id: string
  subject: string | null
  subject_code: string | null
  level: string | null
  settings: ClassroomSettings
}

/**
 * "Mathematics · 9709", "Chemistry HL", or the class's free-text subject when
 * no syllabus code is set. Null when there is nothing to show.
 */
export function classroomSubjectLabel(c: { subject_code?: string | null; subject?: string | null }): string | null {
  const code = c.subject_code?.trim()
  if (code) {
    const name = getSyllabusSubjectName(code)
    if (code.startsWith('ib-')) {
      const level = /-(hl|sl)$/.exec(code)?.[1]
      const base = name ?? code.replace(/^ib-/, '').replace(/-(hl|sl)$/, '').replace(/-/g, ' ')
      return level ? `${base} ${level.toUpperCase()}` : base
    }
    return name ? `${name} · ${code}` : code
  }
  const subject = c.subject?.trim()
  return subject ? subject : null
}

/**
 * The request's best-guess time zone for the first paint of a deadline
 * (Vercel's IP zone, else UTC); <LocalTime> swaps in the browser's own zone
 * after hydration, so this only decides what shows for a moment.
 */
export async function studentRequestTimeZone(): Promise<string> {
  try {
    const h = await headers()
    return safeTimeZone(h.get('x-vercel-ip-timezone')) ?? FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

// ---------------------------------------------------------------------------
// Reads (student RLS client unless noted)
// ---------------------------------------------------------------------------

/** The student's active memberships: classroom id → joined_at. */
async function readActiveMemberships(supabase: SupabaseClient, userId: string): Promise<Map<string, string>> {
  const { rows } = await fetchAllFiltered<{ classroom_id: string; joined_at: string }>(
    'classroom_memberships',
    (from, to) =>
      supabase
        .from('classroom_memberships')
        .select('classroom_id, joined_at')
        .eq('student_id', userId)
        .eq('status', 'active')
        .order('classroom_id')
        .range(from, to),
    { maxRows: MAX_OWN_ROWS }
  )
  return new Map(rows.map((r) => [r.classroom_id, r.joined_at]))
}

/** Classrooms the student can see (active membership of a live class — classroom_student_read). */
async function readClassrooms(supabase: SupabaseClient, ids: readonly string[]): Promise<Map<string, ClassroomRow>> {
  const out = new Map<string, ClassroomRow>()
  for (const part of chunk([...new Set(ids)])) {
    const { data, error } = await supabase.from('classrooms').select(CLASSROOM_COLUMNS).in('id', part)
    if (error) throw new Error(`classrooms: ${error.message}`)
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.set(String(row.id), {
        id: String(row.id),
        name: typeof row.name === 'string' && row.name.trim() ? row.name : 'Your class',
        teacher_id: String(row.teacher_id),
        subject: typeof row.subject === 'string' ? row.subject : null,
        subject_code: typeof row.subject_code === 'string' ? row.subject_code : null,
        level: typeof row.level === 'string' ? row.level : null,
        settings: toSettings(row.settings),
      })
    }
  }
  return out
}

/**
 * Every published, live set the student can see (assignment_student_read:
 * active member of a live class, and targeted when the set is for picked
 * students). `openOnly` narrows the query to sets that can still be open at
 * `now` for the class — the dashboard card never needs the history — plus
 * `alsoIds`, the sets whose close the student's own extension has moved past
 * `now`. The query is only a pre-filter: whether a set is open for the
 * student is studentAssignmentStatus, which the caller applies with their
 * flags.
 */
async function readVisibleSets(
  supabase: SupabaseClient,
  opts: { openOnly?: boolean; now: Date; alsoIds?: readonly string[] }
): Promise<StudentSetRow[]> {
  const nowIso = opts.now.toISOString()
  // A set auto-closes 7 days after its due date (AUTO_CLOSE_AFTER_DUE_DAYS);
  // anything due before this instant is closed whatever else is true.
  const dueCutoff = new Date(opts.now.getTime() - 7 * 86_400_000).toISOString()
  const { rows } = await fetchAllFiltered<Record<string, unknown>>(
    'assignments',
    (from, to) => {
      let q = supabase
        .from('assignments')
        .select(SET_COLUMNS)
        .not('published_at', 'is', null)
        .is('archived_at', null)
      if (opts.openOnly) {
        q = q.or(`closed_at.is.null,closed_at.gt."${nowIso}"`).or(`due_at.is.null,due_at.gt."${dueCutoff}"`)
      }
      return q.order('id').range(from, to)
    },
    { maxRows: MAX_OWN_ROWS }
  )
  const sets = rows.map(toSetRow)
  if (!opts.openOnly || !opts.alsoIds?.length) return sets
  const seen = new Set(sets.map((s) => s.id))
  const extra = [...new Set(opts.alsoIds)].filter((id) => !seen.has(id))
  for (const part of chunk(extra)) {
    const { data, error } = await supabase
      .from('assignments')
      .select(SET_COLUMNS)
      .in('id', part)
      .not('published_at', 'is', null)
      .is('archived_at', null)
    if (error) throw new Error(`assignments: ${error.message}`)
    sets.push(...((data ?? []) as Record<string, unknown>[]).map(toSetRow))
  }
  return sets
}

/** Sets on which the student's own extension runs past `now` (they may be open for them alone). */
async function readOwnOpenExtensions(supabase: SupabaseClient, userId: string, now: Date): Promise<string[]> {
  const { rows } = await fetchAllFiltered<{ assignment_id: string }>(
    'assignment_students',
    (from, to) =>
      supabase
        .from('assignment_students')
        .select('assignment_id')
        .eq('student_id', userId)
        .gt('extended_due_at', now.toISOString())
        .order('assignment_id')
        .range(from, to),
    { maxRows: MAX_OWN_ROWS }
  )
  return rows.map((r) => r.assignment_id)
}

/**
 * The student's attempts among `attemptIds` that carry a teacher confirm or
 * re-mark they may see. RLS (override_student_read) returns only their own
 * attempts' student_visible rows; the filter is repeated so a policy
 * regression cannot reveal a private decision as a "Reviewed" stamp.
 */
async function readVisibleReviews(supabase: SupabaseClient, attemptIds: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>()
  for (const part of chunk([...new Set(attemptIds)])) {
    const { data, error } = await supabase
      .from('teacher_overrides')
      .select('attempt_id, decision')
      .in('attempt_id', part)
      .eq('student_visible', true)
    if (error) throw new Error(`teacher_overrides: ${error.message}`)
    for (const r of (data ?? []) as Array<{ attempt_id: string; decision: string | null }>) {
      if (r.decision === 'confirm' || r.decision === 'override' || r.decision == null) out.add(r.attempt_id)
    }
  }
  return out
}

async function readItems(supabase: SupabaseClient, setIds: readonly string[]): Promise<AssignmentItem[]> {
  const out: AssignmentItem[] = []
  for (const part of chunk([...new Set(setIds)])) {
    // At most 12 items a set, so a chunk of 100 sets is one page.
    const { rows } = await fetchAllFiltered<Record<string, unknown>>('assignment_items', (from, to) =>
      supabase.from('assignment_items').select(ITEM_COLUMNS).in('assignment_id', part).order('id').range(from, to)
    )
    out.push(...rows.map(toItem))
  }
  return out
}

async function readOwnSubmissions(
  supabase: SupabaseClient,
  userId: string,
  setIds?: readonly string[]
): Promise<AssignmentSubmission[]> {
  const read = async (ids: readonly string[] | null) => {
    const { rows } = await fetchAllFiltered<Record<string, unknown>>(
      'assignment_submissions',
      (from, to) => {
        let q = supabase.from('assignment_submissions').select(SUBMISSION_COLUMNS).eq('student_id', userId)
        if (ids) q = q.in('assignment_id', [...ids])
        return q.order('id').range(from, to)
      },
      { maxRows: MAX_OWN_ROWS }
    )
    return rows.map(toSubmission)
  }
  if (!setIds) return read(null)
  const out: AssignmentSubmission[] = []
  for (const part of chunk([...new Set(setIds)])) out.push(...(await read(part)))
  return out
}

async function readOwnFlags(
  supabase: SupabaseClient,
  userId: string,
  setIds?: readonly string[]
): Promise<Map<string, StudentFlags>> {
  const read = async (ids: readonly string[] | null) => {
    const { rows } = await fetchAllFiltered<StudentFlags & { assignment_id: string }>(
      'assignment_students',
      (from, to) => {
        let q = supabase.from('assignment_students').select(FLAG_COLUMNS).eq('student_id', userId)
        if (ids) q = q.in('assignment_id', [...ids])
        return q.order('assignment_id').range(from, to)
      },
      { maxRows: MAX_OWN_ROWS }
    )
    return rows
  }
  const rows = setIds
    ? (await Promise.all(chunk([...new Set(setIds)]).map((part) => read(part)))).flat()
    : await read(null)
  return new Map(
    rows.map((r) => [
      r.assignment_id,
      {
        excused_at: r.excused_at ?? null,
        extended_due_at: r.extended_due_at ?? null,
        feedback: r.feedback ?? null,
        feedback_at: r.feedback_at ?? null,
      },
    ])
  )
}

/** Teacher (or any other user) names, as displayName() — service client, ids already proven relevant. */
async function readDisplayNames(admin: SupabaseClient, ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const part of chunk([...new Set(ids.filter(Boolean))])) {
    const { data, error } = await admin.from('user_profiles').select('id, full_name').in('id', part)
    if (error) throw new Error(`user_profiles: ${error.message}`)
    for (const row of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
      out.set(row.id, displayName(row.full_name, 'Your teacher'))
    }
  }
  return out
}

function teacherName(names: ReadonlyMap<string, string>, id: string | null | undefined): string {
  return (id && names.get(id)) || 'Your teacher'
}

// ---------------------------------------------------------------------------
// GET /api/assignments and /dashboard/assignments
// ---------------------------------------------------------------------------

export type StudentAssignmentList = {
  /** Everything still to do, soonest deadline first. Bounded by what is open, so not paged. */
  open: StudentAssignment[]
  /** One page of finished, excused and closed sets, most recent first. */
  done: StudentAssignment[]
  /** Pass back as `cursor` for the next page of `done`; null on the last page. */
  next_cursor: string | null
}

export function clampDoneLimit(raw: string | number | null | undefined): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DONE_PAGE_SIZE
  return Math.min(MAX_DONE_PAGE_SIZE, Math.max(1, Math.floor(n)))
}

/**
 * The student's sets, split into open and done. Throws StudentInputError for
 * a malformed cursor, and on a database error.
 */
export async function loadStudentAssignments(
  supabase: SupabaseClient,
  userId: string,
  opts: { now?: Date; cursor?: string | null; limit?: number } = {}
): Promise<StudentAssignmentList> {
  const empty: StudentAssignmentList = { open: [], done: [], next_cursor: null }
  if (!isTeacherV2()) return empty
  const now = opts.now ?? new Date()
  const cursor = opts.cursor ? decodeDoneCursor(opts.cursor) : null
  if (opts.cursor && !cursor) throw new StudentInputError('That page link is not valid any more.', 'cursor')
  const limit = clampDoneLimit(opts.limit)

  const [memberships, sets] = await Promise.all([
    readActiveMemberships(supabase, userId),
    readVisibleSets(supabase, { now }),
  ])
  if (sets.length === 0) return empty

  const [classrooms, submissions, flags] = await Promise.all([
    readClassrooms(supabase, sets.map((s) => s.classroom_id)),
    readOwnSubmissions(supabase, userId),
    readOwnFlags(supabase, userId),
  ])
  const handedInSets = new Set(submissions.map((s) => s.assignment_id))
  const listed = sets.filter(
    (s) =>
      classrooms.has(s.classroom_id) &&
      memberships.has(s.classroom_id) &&
      visibleToStudent(
        s,
        memberships.get(s.classroom_id) ?? null,
        handedInSets.has(s.id),
        now,
        flags.get(s.id)?.extended_due_at ?? null
      )
  )

  const derive = (set: StudentSetRow, items: readonly AssignmentItem[]) => {
    const c = classrooms.get(set.classroom_id)!
    return deriveStudentAssignment({
      set,
      classroom: { id: c.id, name: c.name },
      items,
      submissions,
      flags: flags.get(set.id) ?? null,
      now,
    })
  }

  // Which list an OPEN set belongs on depends on what was handed in, so those
  // need their items now. A closed set is done whatever it holds; its items
  // are read only if it lands on the requested page.
  const openFor = (s: StudentSetRow) =>
    studentAssignmentStatus(s, flags.get(s.id)?.extended_due_at ?? null, now) === 'open'
  const statusOpen = listed.filter(openFor)
  const statusClosed = listed.filter((s) => !openFor(s))
  const openItems = await readItems(
    supabase,
    statusOpen.map((s) => s.id)
  )
  const openDerived = statusOpen.map((set) => ({ set, view: derive(set, openItems) }))
  const open = sortOpenSets(openDerived.filter((d) => d.view.phase === 'open').map((d) => d.view))

  type DoneRow = { id: string; deadline: string | null; published_at: string | null; ready: StudentAssignment | null; set: StudentSetRow }
  const doneRows: DoneRow[] = [
    ...openDerived
      .filter((d) => d.view.phase === 'done')
      .map(({ set, view }) => ({ id: view.id, deadline: view.deadline, published_at: view.published_at, ready: view, set })),
    ...statusClosed.map((s) => ({
      id: s.id,
      deadline: effectiveDueAt(s.due_at, flags.get(s.id)?.extended_due_at ?? null),
      published_at: s.published_at,
      ready: null,
      set: s,
    })),
  ]
  const { page, next_cursor } = pageDoneSets(doneRows, cursor, limit)
  const needItems = page.filter((r) => !r.ready).map((r) => r.id)
  const pageItems = needItems.length ? await readItems(supabase, needItems) : []
  const done = page.map((r) => r.ready ?? derive(r.set, pageItems))

  return { open, done, next_cursor }
}

/**
 * The dashboard's "Set by your teacher" card: the next open set and how many
 * are open, or null when there are none (the section is then hidden). Never
 * throws — a failure here must not take the dashboard down with it.
 */
export async function loadAssignmentsSetCard(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<{ next: StudentAssignment; open_count: number } | null> {
  if (!isTeacherV2()) return null
  try {
    const extended = await readOwnOpenExtensions(supabase, userId, now)
    const sets = await readVisibleSets(supabase, { openOnly: true, now, alsoIds: extended })
    if (sets.length === 0) return null
    const ids = sets.map((s) => s.id)
    const [classrooms, items, submissions, flags] = await Promise.all([
      readClassrooms(supabase, sets.map((s) => s.classroom_id)),
      readItems(supabase, ids),
      readOwnSubmissions(supabase, userId, ids),
      readOwnFlags(supabase, userId, ids),
    ])
    const open = sortOpenSets(
      sets
        .filter((s) => classrooms.has(s.classroom_id))
        .map((set) => {
          const c = classrooms.get(set.classroom_id)!
          return deriveStudentAssignment({
            set,
            classroom: { id: c.id, name: c.name },
            items,
            submissions,
            flags: flags.get(set.id) ?? null,
            now,
          })
        })
        .filter((a) => a.phase === 'open')
    )
    return open.length > 0 ? { next: open[0], open_count: open.length } : null
  } catch (err) {
    console.error('[student/assignments] set card failed', err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// GET /api/assignments/[aid] and /dashboard/assignments/[id]
// ---------------------------------------------------------------------------

/** A teacher's note on one of the student's hand-ins for this set. */
export type StudentFeedbackNote = Pick<TeacherFeedback, 'id' | 'attempt_id' | 'body' | 'created_at' | 'read_at'> & {
  /** The set item the attempt was handed in for, when it maps to one. */
  item_id: string | null
  teacher_display_name: string
}

export type StudentSetDetail = {
  assignment: Pick<
    Assignment,
    'id' | 'title' | 'instructions' | 'kind' | 'is_mock' | 'subject_code' | 'due_at' | 'published_at' | 'closed_at' | 'settings'
  >
  classroom: { id: string; name: string; subject_label: string | null; teacher_display_name: string }
  /** The same classification the list shows. */
  summary: StudentAssignment
  items: StudentSetItem[]
  /** The student's own flags on this set (excused, extension, the teacher's note). */
  flags: StudentFlags | null
  /** Teacher notes on the attempts handed in for this set, newest first. */
  feedback: StudentFeedbackNote[]
  /** Present only when the class allows it and enough students have a mark. */
  class_average: { pct: number; n: number } | null
}

/**
 * One set as its student sees it, or null when they may not see it (not a
 * member, left, class archived, set deleted or targeted at others) — the
 * caller answers 404 without saying which.
 */
export async function loadStudentAssignment(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  assignmentId: string,
  opts: { now?: Date } = {}
): Promise<StudentSetDetail | null> {
  if (!isTeacherV2() || !isUuid(assignmentId)) return null
  const now = opts.now ?? new Date()
  const id = assignmentId.toLowerCase()

  // RLS decides visibility; nothing below runs for a set the student cannot see.
  const { data: setRow, error: setError } = await supabase
    .from('assignments')
    .select(DETAIL_SET_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (setError) throw new Error(`assignments: ${setError.message}`)
  if (!setRow) return null
  const raw = setRow as Record<string, unknown>
  const set = toSetRow(raw)
  if (!set.published_at || set.archived_at) return null

  const [classrooms, memberships, items, submissions, flagsMap] = await Promise.all([
    readClassrooms(supabase, [set.classroom_id]),
    readActiveMemberships(supabase, userId),
    readItems(supabase, [set.id]),
    readOwnSubmissions(supabase, userId, [set.id]),
    readOwnFlags(supabase, userId, [set.id]),
  ])
  const classroom = classrooms.get(set.classroom_id)
  if (!classroom || !memberships.has(classroom.id)) return null
  const flags = flagsMap.get(set.id) ?? null
  const extendedDueAt = flags?.extended_due_at ?? null
  if (!visibleToStudent(set, memberships.get(classroom.id) ?? null, submissions.length > 0, now, extendedDueAt)) return null

  const summary = deriveStudentAssignment({
    set,
    classroom: { id: classroom.id, name: classroom.name },
    items,
    submissions,
    flags,
    now,
  })

  const schemeIds = items.map((i) => i.mark_scheme_id).filter((s): s is string => !!s)
  const attemptIds = submissions.map((s) => s.attempt_id).filter((a): a is string => !!a)
  const [previews, feedbackRows, classAverage, visibleReviews] = await Promise.all([
    readQuestionPreviews(admin, schemeIds),
    readOwnFeedback(supabase, userId, attemptIds),
    classAverageAllowed(classroom.settings)
      ? readClassAverage(admin, set.id, items, classroom.settings)
      : Promise.resolve(null),
    readVisibleReviews(supabase, attemptIds),
  ])
  const names = await readDisplayNames(admin, [classroom.teacher_id, ...feedbackRows.map((f) => f.teacher_id)])
  const itemByAttempt = new Map(
    submissions.filter((s) => s.attempt_id).map((s) => [s.attempt_id as string, s.item_id])
  )

  const subjectCode = typeof raw.subject_code === 'string' ? raw.subject_code : ''
  return {
    assignment: {
      id: set.id,
      title: set.title,
      instructions: typeof raw.instructions === 'string' && raw.instructions.trim() ? raw.instructions : null,
      kind: set.kind,
      is_mock: set.is_mock,
      subject_code: subjectCode,
      due_at: set.due_at,
      published_at: set.published_at,
      closed_at: set.closed_at,
      settings: set.settings,
    },
    classroom: {
      id: classroom.id,
      name: classroom.name,
      subject_label: classroomSubjectLabel(classroom),
      teacher_display_name: teacherName(names, classroom.teacher_id),
    },
    summary,
    items: buildStudentSetItems({
      set: { id: set.id, title: set.title, subject_code: subjectCode, due_at: set.due_at },
      items,
      submissions,
      flags,
      canHandIn: canHandIn(set, now, extendedDueAt),
      previews,
      visibleReviews,
    }),
    flags,
    feedback: feedbackRows
      .map((f) => ({
        id: f.id,
        attempt_id: f.attempt_id,
        body: f.body,
        created_at: f.created_at,
        read_at: f.read_at,
        item_id: itemByAttempt.get(f.attempt_id) ?? null,
        teacher_display_name: teacherName(names, f.teacher_id),
      }))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    class_average: classAverage,
  }
}

/** The start of each banked question (service client: mark_schemes is not client-readable). */
async function readQuestionPreviews(
  admin: SupabaseClient,
  schemeIds: readonly string[]
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>()
  const ids = [...new Set(schemeIds)]
  if (ids.length === 0) return out
  try {
    for (const part of chunk(ids)) {
      // question_text only — the scheme itself is never read here.
      const { data, error } = await admin.from('mark_schemes').select('id, question_text').in('id', part)
      if (error) throw new Error(error.message)
      for (const row of (data ?? []) as Array<{ id: string; question_text: string | null }>) {
        out.set(row.id, questionPreview(row.question_text))
      }
    }
  } catch (err) {
    // A missing preview costs the student a line of context, not the page.
    console.warn('[student/assignments] question previews unavailable', err instanceof Error ? err.message : err)
  }
  return out
}

type FeedbackRow = Pick<TeacherFeedback, 'id' | 'attempt_id' | 'body' | 'created_at' | 'read_at' | 'teacher_id'>

async function readOwnFeedback(
  supabase: SupabaseClient,
  userId: string,
  attemptIds: readonly string[]
): Promise<FeedbackRow[]> {
  const out: FeedbackRow[] = []
  for (const part of chunk([...new Set(attemptIds)])) {
    const { data, error } = await supabase
      .from('teacher_feedback')
      .select('id, attempt_id, body, created_at, read_at, teacher_id')
      .eq('student_id', userId)
      .in('attempt_id', part)
    if (error) throw new Error(`teacher_feedback: ${error.message}`)
    out.push(...((data ?? []) as FeedbackRow[]))
  }
  return out
}

/**
 * Service read of every hand-in on the set, reduced to one number before it
 * leaves this function. Only called when the class setting allows it.
 */
async function readClassAverage(
  admin: SupabaseClient,
  assignmentId: string,
  items: readonly AssignmentItem[],
  settings: ClassroomSettings
): Promise<{ pct: number; n: number } | null> {
  try {
    const { rows } = await fetchAllFiltered<Record<string, unknown>>('assignment_submissions', (from, to) =>
      admin
        .from('assignment_submissions')
        .select('id, student_id, item_id, marks_earned, total_marks')
        .eq('assignment_id', assignmentId)
        .order('id')
        .range(from, to)
    )
    return classAveragePct({
      settings,
      items,
      submissions: rows.map((r) => ({
        student_id: String(r.student_id),
        item_id: String(r.item_id),
        marks_earned: num(r.marks_earned),
        total_marks: num(r.total_marks),
      })),
    })
  } catch (err) {
    console.warn('[student/assignments] class average unavailable', err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// /dashboard/attempt/[id] — the teacher's decision and notes on one attempt
// ---------------------------------------------------------------------------

export type AttemptTeacherNotes = {
  review: (TeacherReviewSummary & { teacher_display_name: string }) | null
  notes: Array<Pick<TeacherFeedback, 'id' | 'body' | 'created_at' | 'read_at'> & { teacher_display_name: string }>
}

/**
 * The visible review and the notes on one of the student's attempts, or null
 * when there are none. Both reads use the student's RLS client, so private
 * decisions (student_visible = false) never arrive. Never throws.
 */
export async function loadAttemptTeacherNotes(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  input: {
    attemptId: string
    userId: string
    marksEarned: number | null
    totalMarks: number | null
    aiMarking: unknown
  }
): Promise<AttemptTeacherNotes | null> {
  if (!isTeacherV2() || !isUuid(input.attemptId)) return null
  try {
    const [overridesRes, feedbackRes] = await Promise.all([
      supabase
        .from('teacher_overrides')
        .select('decision, created_at, teacher_id, reasoning_note, teacher_notes, student_visible')
        .eq('attempt_id', input.attemptId)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('teacher_feedback')
        .select('id, body, created_at, read_at, teacher_id')
        .eq('attempt_id', input.attemptId)
        .eq('student_id', input.userId)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    if (overridesRes.error) throw new Error(`teacher_overrides: ${overridesRes.error.message}`)
    if (feedbackRes.error) throw new Error(`teacher_feedback: ${feedbackRes.error.message}`)

    // RLS already filters on student_visible; checked again so a policy
    // regression cannot surface a teacher's private decision.
    const rows = ((overridesRes.data ?? []) as Array<TeacherReviewRow & { student_visible?: boolean | null }>).filter(
      (r) => r.student_visible !== false
    )
    const original = num(plainObject(input.aiMarking)?.original_marks_earned)
    const review = summariseTeacherReview({
      rows,
      originalMarks: original,
      currentMarks: input.marksEarned,
      totalMarks: input.totalMarks,
    })
    const feedback = (feedbackRes.data ?? []) as FeedbackRow[]
    if (!review && feedback.length === 0) return null

    const names = await readDisplayNames(admin, [review?.teacher_id ?? '', ...feedback.map((f) => f.teacher_id)])
    return {
      review: review ? { ...review, teacher_display_name: teacherName(names, review.teacher_id) } : null,
      notes: feedback.map((f) => ({
        id: f.id,
        body: f.body,
        created_at: f.created_at,
        read_at: f.read_at,
        teacher_display_name: teacherName(names, f.teacher_id),
      })),
    }
  } catch (err) {
    console.error('[student/assignments] attempt notes failed', err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// GET /api/classrooms/mine and the account page's MyClassesCard
// ---------------------------------------------------------------------------

export type MyClass = {
  id: string
  name: string
  /** Subject label ("Mathematics · 9709"); null when the class has none. */
  subject: string | null
  /** First name and initial only. */
  teacher_display_name: string
  joined_at: string
  /** Marks a month this class adds to the student's allowance (0 when none). */
  class_bonus: number
}

/** The student's live classes, most recently joined first. */
export async function loadMyClasses(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string
): Promise<MyClass[]> {
  const memberships = await readActiveMemberships(supabase, userId)
  if (memberships.size === 0) return []
  const classrooms = await readClassrooms(supabase, [...memberships.keys()])
  if (classrooms.size === 0) return []

  const teacherIds = [...new Set([...classrooms.values()].map((c) => c.teacher_id))]
  const profiles = new Map<string, { full_name: string | null; teacher_verified_at: string | null }>()
  for (const part of chunk([...teacherIds, userId])) {
    const { data, error } = await admin.from('user_profiles').select('id, full_name, teacher_verified_at').in('id', part)
    if (error) throw new Error(`user_profiles: ${error.message}`)
    for (const row of (data ?? []) as Array<{ id: string; full_name: string | null; teacher_verified_at: string | null }>) {
      profiles.set(row.id, { full_name: row.full_name, teacher_verified_at: row.teacher_verified_at })
    }
  }
  const viewerIsTeacher = Boolean(profiles.get(userId)?.teacher_verified_at)

  return [...classrooms.values()]
    .map((c) => {
      const teacher = profiles.get(c.teacher_id)
      return {
        id: c.id,
        name: c.name,
        subject: classroomSubjectLabel(c),
        teacher_display_name: displayName(teacher?.full_name ?? null, 'Your teacher'),
        joined_at: memberships.get(c.id) ?? '',
        class_bonus: classBonusFor({
          inVerifiedClassroom: Boolean(teacher?.teacher_verified_at),
          isTeacher: viewerIsTeacher,
        }),
      }
    })
    .sort((a, b) => (Date.parse(b.joined_at) || 0) - (Date.parse(a.joined_at) || 0))
}

// ---------------------------------------------------------------------------
// /account/privacy export (spec §8)
// ---------------------------------------------------------------------------

export type ClassroomPrivacyExport = {
  memberships: Array<{
    classroom_id: string
    classroom_name: string | null
    teacher: string
    status: MembershipStatus
    joined_at: string | null
    left_at: string | null
    removed_at: string | null
  }>
  assignments: Array<Pick<Assignment, 'id' | 'classroom_id' | 'title' | 'kind' | 'due_at' | 'published_at' | 'closed_at'>>
  assignment_flags: Array<Record<string, unknown>>
  submissions: Array<Record<string, unknown>>
  teacher_reviews: Array<{
    attempt_id: string
    decision: string
    marks_after: number | null
    note: string | null
    teacher: string
    created_at: string
  }>
  teacher_feedback: Array<{ attempt_id: string; classroom_id: string | null; body: string; teacher: string; created_at: string; read_at: string | null }>
  teacher_activity: Array<{ action: string; classroom_id: string | null; teacher: string; created_at: string; details: Record<string, unknown> }>
  /** True when any list hit the export's row bound. */
  truncated: boolean
}

/**
 * Everything the teacher system holds about one student, for their own data
 * export: their memberships (every status), the sets they were given or
 * handed work in for, their flags and hand-ins, the decisions and notes their
 * teachers showed them, and the audit rows about them. Service client —
 * called only by the export route for the signed-in user themselves. Other
 * people appear only as a teacher's display name.
 */
export async function loadClassroomPrivacyExport(admin: SupabaseClient, userId: string): Promise<ClassroomPrivacyExport> {
  let truncated = false
  const all = async <T>(label: string, page: PageQuery) => {
    const res = await fetchAllFiltered<T>(label, page, { maxRows: MAX_OWN_ROWS })
    if (res.truncated) truncated = true
    return res.rows
  }

  const [memberships, flags, submissions, reviews, feedback, audit] = await Promise.all([
    all<Record<string, unknown>>('classroom_memberships', (from, to) =>
      admin
        .from('classroom_memberships')
        .select('classroom_id, status, joined_at, left_at, removed_at')
        .eq('student_id', userId)
        .order('classroom_id')
        .range(from, to)
    ),
    all<Record<string, unknown>>('assignment_students', (from, to) =>
      admin
        .from('assignment_students')
        .select('assignment_id, excused_at, extended_due_at, feedback, feedback_at, reminded_at, created_at')
        .eq('student_id', userId)
        .order('assignment_id')
        .range(from, to)
    ),
    all<Record<string, unknown>>('assignment_submissions', (from, to) =>
      admin
        .from('assignment_submissions')
        .select(
          'assignment_id, item_id, attempt_id, attempt_count, marks_earned, total_marks, status, source, first_submitted_at, last_submitted_at'
        )
        .eq('student_id', userId)
        .order('id')
        .range(from, to)
    ),
    all<Record<string, unknown>>('teacher_overrides', (from, to) =>
      admin
        .from('teacher_overrides')
        .select(
          'id, attempt_id, decision, override_total_earned, reasoning_note, teacher_notes, teacher_id, created_at, student_visible, attempts!inner(user_id)'
        )
        .eq('attempts.user_id', userId)
        .eq('student_visible', true)
        .order('id')
        .range(from, to)
    ),
    all<Record<string, unknown>>('teacher_feedback', (from, to) =>
      admin
        .from('teacher_feedback')
        .select('id, attempt_id, classroom_id, body, teacher_id, created_at, read_at')
        .eq('student_id', userId)
        .order('id')
        .range(from, to)
    ),
    all<Record<string, unknown>>('teacher_audit_log', (from, to) =>
      admin
        .from('teacher_audit_log')
        .select('id, actor_id, classroom_id, action, meta, created_at')
        .eq('student_id', userId)
        .order('id')
        .range(from, to)
    ),
  ])

  const classroomIds = [...new Set(memberships.map((m) => String(m.classroom_id)))]
  const setIds = [
    ...new Set([...flags.map((f) => String(f.assignment_id)), ...submissions.map((s) => String(s.assignment_id))]),
  ]
  const classNames = new Map<string, { name: string; teacher_id: string }>()
  for (const part of chunk(classroomIds)) {
    const { data, error } = await admin.from('classrooms').select('id, name, teacher_id').in('id', part)
    if (error) throw new Error(`classrooms: ${error.message}`)
    for (const c of (data ?? []) as Array<{ id: string; name: string; teacher_id: string }>) {
      classNames.set(c.id, { name: c.name, teacher_id: c.teacher_id })
    }
  }
  const sets: ClassroomPrivacyExport['assignments'] = []
  for (const part of chunk(setIds)) {
    const { data, error } = await admin
      .from('assignments')
      .select('id, classroom_id, title, kind, due_at, published_at, closed_at')
      .in('id', part)
    if (error) throw new Error(`assignments: ${error.message}`)
    sets.push(...((data ?? []) as ClassroomPrivacyExport['assignments']))
  }

  const visibleReviews = reviews.filter((r) => r.decision === 'confirm' || r.decision === 'override' || r.decision == null)
  // A 'reviewed' hand-in whose decision the teacher kept private is exported
  // as what its timestamps say, as the student's own pages show it.
  const reviewedAttempts = new Set(visibleReviews.map((r) => String(r.attempt_id)))
  const dueBySet = new Map(sets.map((a) => [a.id, a.due_at]))
  const extensionBySet = new Map(flags.map((f) => [String(f.assignment_id), (f.extended_due_at as string | null) ?? null]))
  const exportedSubmissions = submissions.map((sub) => ({
    ...sub,
    status: studentSubmissionStatus(
      {
        status: sub.status as AssignmentSubmission['status'],
        attempt_id: (sub.attempt_id as string | null) ?? null,
        first_submitted_at: String(sub.first_submitted_at),
      },
      reviewedAttempts,
      dueBySet.get(String(sub.assignment_id)) ?? null,
      extensionBySet.get(String(sub.assignment_id)) ?? null
    ),
  }))
  const names = await readDisplayNames(admin, [
    ...[...classNames.values()].map((c) => c.teacher_id),
    ...visibleReviews.map((r) => String(r.teacher_id)),
    ...feedback.map((f) => String(f.teacher_id)),
    ...audit.map((a) => String(a.actor_id)),
  ])

  return {
    memberships: memberships.map((m) => {
      const c = classNames.get(String(m.classroom_id))
      return {
        classroom_id: String(m.classroom_id),
        classroom_name: c?.name ?? null,
        teacher: teacherName(names, c?.teacher_id),
        status: (m.status as MembershipStatus) ?? 'active',
        joined_at: (m.joined_at as string | null) ?? null,
        left_at: (m.left_at as string | null) ?? null,
        removed_at: (m.removed_at as string | null) ?? null,
      }
    }),
    assignments: sets,
    assignment_flags: flags,
    submissions: exportedSubmissions,
    teacher_reviews: visibleReviews.map((r) => ({
      attempt_id: String(r.attempt_id),
      decision: String(r.decision ?? 'override'),
      marks_after: num(r.override_total_earned),
      note: ((r.reasoning_note ?? r.teacher_notes) as string | null) ?? null,
      teacher: teacherName(names, String(r.teacher_id)),
      created_at: String(r.created_at),
    })),
    teacher_feedback: feedback.map((f) => ({
      attempt_id: String(f.attempt_id),
      classroom_id: (f.classroom_id as string | null) ?? null,
      body: String(f.body),
      teacher: teacherName(names, String(f.teacher_id)),
      created_at: String(f.created_at),
      read_at: (f.read_at as string | null) ?? null,
    })),
    teacher_activity: audit.map((a) => ({
      action: String(a.action),
      classroom_id: (a.classroom_id as string | null) ?? null,
      teacher: teacherName(names, String(a.actor_id)),
      created_at: String(a.created_at),
      details: exportableAuditDetails(String(a.action), a.meta),
    })),
    truncated,
  }
}
