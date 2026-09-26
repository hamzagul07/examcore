import 'server-only'

import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSubjectByCode } from '@/lib/profile-options'
import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { requireTeacher } from '@/lib/teacher-auth'
import {
  computeBlindspots,
  scopeClassroomAttempts,
  summarizeClassAnalytics,
  type ClassSummary,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import {
  attachSchemes,
  attemptColumns,
  chunk,
  fetchAllFiltered,
  getClassroomAttempts,
  getClassroomMembers,
  getRosterProfiles,
  getStudentProfiles,
  loadAttemptRows,
  loadPublishedSets,
  toClassroomAttempt,
  type AttemptRow,
} from '@/lib/teacher-classroom-data'
import { toBlindspotInputs, type BlindspotInput } from '@/lib/teacher/blindspots'
import {
  buildCohortDueList,
  buildStudentDueTopics,
  type CohortDueTopic,
  type StudentDueTopic,
} from '@/lib/teacher/cohort-due'
import { buildCohortGapReport, headlineGap, type CohortGapReport, type MarkTypeGap } from '@/lib/teacher/cohort-gaps'
import { displayName } from '@/lib/teacher/display-name'
import type { FeedbackNote } from '@/lib/teacher/feedback'
import { buildErrorGroups } from '@/lib/teacher/groups'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'
import { isUuid, loadTeacherClassroom, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import { auditLog } from '@/lib/teacher/notify'
import {
  TOPIC_CANDIDATES,
  pickTopicQuestions,
  questionPreview,
  resolveDepsFor,
} from '@/lib/teacher/assignments/resolve-items'
import type {
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  ErrorGroup,
  ReviewDecision,
} from '@/lib/teacher/types'
import {
  HISTORY_PAGE_SIZE,
  HISTORY_SCAN_BATCH,
  advanceHistoryScan,
  historyCursorFilter,
  historyScanContinues,
  latestDecisions,
  nextHistoryCursor,
  startHistoryScan,
  toHistoryRow,
  viewAuditDue,
  type HistoryCursor,
  type StudentHistoryRow,
} from '@/lib/teacher/insights/history'
import type { RecordSet } from '@/lib/teacher/insights/student-record'

/**
 * Server reads for the class insight surfaces (package insights-omni:
 * `T/{analytics,blindspots,quadrants,due,gaps,groups}`, `T/students/[sid]/{due,history}`,
 * the Gaps, Students and student pages; docs/TEACHER_SYSTEM_SPEC.md §3, §4, §8).
 *
 * Clients, as everywhere in the teacher system:
 *
 *   - `supabase` is the teacher's RLS client. Attempts, memberships, sets and
 *     decisions are read through it, so a bug here cannot reach another
 *     teacher's class, and a student who left fails closed at the database.
 *   - `admin` (the service client) is passed in only after the caller has
 *     proven ownership of the classroom, and is used only where RLS is
 *     deliberately narrower than the job: the schedule tables behind due
 *     topics (no client policies), paper codes of banked questions (to place
 *     an attempt in the class subject; never the scheme text), sample
 *     question previews, an archived class's retained hand-ins, and the
 *     audit log.
 *
 * Every class read applies the classroom privacy rule (active members,
 * marked since joining, in the class subject) through getClassroomAttempts /
 * scopeClassroomAttempts, whichever client is passed. An archived class has
 * no live reads at all: its members' current work is no longer the
 * teacher's (spec conflict rulings), so those functions return nothing.
 */

// ---------------------------------------------------------------------------
// Route shape
// ---------------------------------------------------------------------------

export const NO_STORE = { 'Cache-Control': 'no-store' } as const

export function jsonError(status: number, error: string, field?: string) {
  return NextResponse.json(field ? { error, field } : { error }, { status, headers: NO_STORE })
}

export type ClassroomRouteAuth = { supabase: SupabaseClient; user: User; classroom: TeacherClassroomRow }

/**
 * The teacher route shape (spec §3): signed in (401) → a teacher (403) → the
 * owner of this classroom (404 — the same answer for "does not exist" and
 * "not yours", read through RLS). The service client is created by the
 * caller only after this returns a classroom.
 */
export async function authorizeClassroomRoute(
  classroomId: string
): Promise<ClassroomRouteAuth | { response: NextResponse }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { response: jsonError(401, 'Unauthorized') }
  const teacher = await requireTeacher(supabase, user.id)
  if (!teacher.ok) return { response: jsonError(403, 'Not a teacher') }
  const classroom = isUuid(classroomId) ? await loadTeacherClassroom(supabase, user.id, classroomId) : null
  if (!classroom) return { response: jsonError(404, 'Classroom not found') }
  return { supabase, user, classroom }
}

/** Logs the detail, answers with a message that leaks nothing. */
export function internalError(context: string, err: unknown, message: string) {
  console.error(`[teacher/insights] ${context} failed:`, err instanceof Error ? err.message : err)
  return jsonError(500, message)
}

// ---------------------------------------------------------------------------
// The class
// ---------------------------------------------------------------------------

export type ScopedClass = {
  attempts: ClassroomAttempt[]
  /** Older work existed past the read limit: say so rather than present part of the class as all of it. */
  truncated: boolean
  /** Active members — the roster the figures are computed against. */
  studentIds: string[]
}

type ClassScope = Pick<TeacherClassroomRow, 'id' | 'subject_code' | 'archived_at'>

/**
 * The class's marked work under the privacy rule. `withMarking` reads the
 * per-mark detail (gap report, error groups); topic, quadrant and summary
 * reads should leave it off — it is most of the payload.
 */
export async function loadScopedClass(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope,
  opts: { withMarking: boolean; limit?: number }
): Promise<ScopedClass> {
  if (classroom.archived_at) {
    const members = await getClassroomMembers(supabase, classroom.id, { status: ['active'] })
    return { attempts: [], truncated: false, studentIds: members.map((m) => m.student_id) }
  }
  return getClassroomAttempts(supabase, classroom.id, {
    subjectCode: classroom.subject_code,
    withMarking: opts.withMarking,
    limit: opts.limit,
    // Only to place past-paper attempts in the subject by their paper code.
    admin,
  })
}

/** student id → "Amira K." for the given students (current students only; others are absent). */
export async function loadDisplayNames(
  supabase: SupabaseClient,
  studentIds: readonly string[]
): Promise<Record<string, string>> {
  if (studentIds.length === 0) return {}
  const profiles = await getStudentProfiles(supabase, studentIds)
  const out: Record<string, string> = {}
  for (const id of studentIds) {
    const profile = profiles.get(id)
    if (profile) out[id] = displayName(profile.full_name)
  }
  return out
}

/** Topic rows for the blindspot list, weakest first, against the class roster. */
export function classBlindspots(scoped: ScopedClass, subjectCode: string | null): BlindspotInput[] {
  return toBlindspotInputs(computeBlindspots(scoped.attempts, subjectCode), scoped.studentIds.length)
}

export type ClassGaps = {
  summary: ClassSummary
  blindspots: BlindspotInput[]
  report: CohortGapReport
  headline: MarkTypeGap | null
  groups: ErrorGroup[]
  /** Display names for the students in `groups`. */
  names: Record<string, string>
  truncated: boolean
}

/**
 * Everything the Gaps page reads from marked work, from ONE scoped read with
 * per-mark detail: the class summary, the blindspot topics, the mark-type
 * report and the error groups.
 */
export async function loadClassGaps(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope
): Promise<ClassGaps> {
  const scoped = await loadScopedClass(supabase, admin, classroom, { withMarking: true })
  const report = buildCohortGapReport(scoped.attempts)
  const groups = classroom.subject_code ? buildErrorGroups(scoped.attempts, classroom.subject_code) : []
  const inGroups = [...new Set(groups.flatMap((g) => g.student_ids))]
  return {
    summary: summarizeClassAnalytics(scoped.attempts, scoped.studentIds, classroom.subject_code),
    blindspots: classBlindspots(scoped, classroom.subject_code),
    report,
    headline: headlineGap(report),
    groups,
    names: await loadDisplayNames(supabase, inGroups),
    truncated: scoped.truncated,
  }
}

// ---------------------------------------------------------------------------
// Due topics (review_schedule / lesson_recall — service role only)
// ---------------------------------------------------------------------------

function topicLabels(rows: ReadonlyArray<{ subjectCode: string; topicCode: string }>) {
  const topicNames: Record<string, string> = {}
  const subjectLabels: Record<string, string> = {}
  for (const r of rows) {
    subjectLabels[r.subjectCode] ??= getSubjectByCode(r.subjectCode)?.label ?? r.subjectCode
    const key = `${r.subjectCode}::${r.topicCode}`
    topicNames[key] ??= getSyllabusTopicByCode(r.subjectCode, r.topicCode)?.name ?? r.topicCode
  }
  return { topicNames, subjectLabels }
}

export type ClassDue = { topics: CohortDueTopic[]; students: number }

/**
 * Topics cooling off across the class: active members only, in the class
 * subject, worked on since each joined. Throws when the schedule tables
 * cannot be read — a partial list must not pass for the whole one.
 */
export async function loadClassDue(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope,
  opts: { limit?: number } = {}
): Promise<ClassDue> {
  if (classroom.archived_at) return { topics: [], students: 0 }
  const members = await getClassroomMembers(supabase, classroom.id, { status: ['active'] })
  if (members.length === 0) return { topics: [], students: 0 }
  const ids = members.map((m) => m.student_id)
  const { rows, error } = await loadDueRowsForStudents(admin, ids, {
    subjectCode: classroom.subject_code,
    joinedAt: new Map(members.map((m) => [m.student_id, m.joined_at])),
  })
  if (error) throw new Error(`due rows: ${error}`)
  const names = await loadDisplayNames(supabase, ids)
  return {
    topics: buildCohortDueList({
      totalStudents: ids.length,
      rows,
      names,
      ...topicLabels(rows),
      limit: opts.limit ?? 8,
    }),
    students: ids.length,
  }
}

/** One active member's due topics, under the same scope. Throws on a read error. */
export async function loadStudentDue(
  admin: SupabaseClient,
  classroom: ClassScope,
  member: ClassroomMember,
  opts: { limit?: number } = {}
): Promise<StudentDueTopic[]> {
  if (classroom.archived_at || member.status !== 'active') return []
  const { rows, error } = await loadDueRowsForStudents(admin, [member.student_id], {
    subjectCode: classroom.subject_code,
    joinedAt: new Map([[member.student_id, member.joined_at]]),
  })
  if (error) throw new Error(`due rows: ${error}`)
  return buildStudentDueTopics(
    rows.filter((r) => r.userId === member.student_id),
    opts.limit ?? 10
  )
}

// ---------------------------------------------------------------------------
// Blindspot sample questions (the bank; previews only, never the scheme)
// ---------------------------------------------------------------------------

export type BlindspotSample = {
  id: string
  paper_code: string
  paper_session: string
  question_number: string
  total_marks: number | null
  /** ≤160 characters of the question. */
  preview: string | null
}

/**
 * A few banked questions per topic, from the class's own subject (by paper
 * code), newest sessions first and one per paper before any repeats — the
 * same choice the composer's topic picker makes.
 */
export async function loadBlindspotSamples(
  admin: SupabaseClient,
  subjectCode: string | null,
  codes: readonly string[],
  perTopic = 3
): Promise<Record<string, BlindspotSample[]>> {
  const out: Record<string, BlindspotSample[]> = {}
  if (!subjectCode || codes.length === 0) return out
  const deps = resolveDepsFor(admin)
  // Candidates are read in parallel; the picking is sequential so a question
  // tagged with two weak topics is shown once, under the first, and the
  // choice never depends on which read came back first.
  const candidates = await Promise.all(
    codes.map((code) => deps.topicQuestions(subjectCode, code, TOPIC_CANDIDATES))
  )
  const taken = new Set<string>()
  const chosen = codes.map((code, i) => {
    const inSubject = candidates[i].filter((q) => q.paper_code.split('/')[0] === subjectCode)
    const questions = pickTopicQuestions(inSubject, perTopic, taken)
    for (const q of questions) taken.add(q.id)
    return { code, questions }
  })
  const ids = [...taken]
  const previews = new Map<string, string | null>()
  for (const part of chunk(ids)) {
    const { data, error } = await admin.from('mark_schemes').select('id, question_text').in('id', part)
    if (error) throw new Error(`mark_schemes: ${error.message}`)
    for (const r of (data ?? []) as Array<{ id: string; question_text: string | null }>) {
      previews.set(r.id, questionPreview(r.question_text))
    }
  }
  for (const { code, questions } of chosen) {
    out[code] = questions.map((q) => ({
      id: q.id,
      paper_code: q.paper_code,
      paper_session: q.paper_session,
      question_number: q.question_number,
      total_marks: q.total_marks,
      preview: previews.get(q.id) ?? null,
    }))
  }
  return out
}

// ---------------------------------------------------------------------------
// One student
// ---------------------------------------------------------------------------

export type StudentInClass = { member: ClassroomMember; full_name: string | null }

/**
 * A member of this classroom (any status) and their name, or null when they
 * never were one. Names come only from the SECURITY DEFINER RPCs (spec §8):
 * teacher_student_profiles for a current student, the class roster RPC for
 * one who left or was removed, or any member of an archived class.
 */
export async function loadStudentInClass(
  supabase: SupabaseClient,
  classroomId: string,
  studentId: string
): Promise<StudentInClass | null> {
  if (!isUuid(studentId)) return null
  const { data, error } = await supabase
    .from('classroom_memberships')
    .select('student_id, status, joined_at, left_at, removed_at')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`classroom_memberships: ${error.message}`)
  if (!data) return null
  const member = data as ClassroomMember

  let fullName: string | null | undefined
  if (member.status === 'active') {
    fullName = (await getStudentProfiles(supabase, [member.student_id])).get(member.student_id)?.full_name
  }
  if (fullName === undefined) {
    fullName = (await getRosterProfiles(supabase, classroomId)).find((p) => p.id === member.student_id)?.full_name
  }
  return { member, full_name: fullName ?? null }
}

/**
 * One student's scoped attempts in this class, newest first (for their head
 * figures). Nothing for a student who is no longer active or an archived
 * class. Only this student's rows are read — never the whole class.
 */
export async function loadStudentAttempts(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope,
  member: ClassroomMember,
  opts: { limit?: number } = {}
): Promise<{ attempts: ClassroomAttempt[]; truncated: boolean }> {
  if (classroom.archived_at || member.status !== 'active') return { attempts: [], truncated: false }
  const { attempts, truncated } = await loadAttemptRows(supabase, [member.student_id], {
    lowerBound: member.joined_at,
    withMarking: false,
    limit: opts.limit ?? 2000,
  })
  await attachSchemes(admin, attempts)
  return { attempts: scopeClassroomAttempts(attempts, [member], { subjectCode: classroom.subject_code }), truncated }
}

export type StudentHistoryPage = { attempts: StudentHistoryRow[]; next_cursor: string | null }

/**
 * One page of a student's history in this class (HISTORY_PAGE_SIZE rows),
 * after `cursor`. See lib/teacher/insights/history.ts for how a page is
 * assembled from in-scope rows only.
 */
export async function loadStudentHistory(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope,
  member: ClassroomMember,
  cursor: HistoryCursor | null
): Promise<StudentHistoryPage> {
  if (classroom.archived_at || member.status !== 'active') return { attempts: [], next_cursor: null }

  const columns = attemptColumns(false)
  let scan = startHistoryScan<ClassroomAttempt>(cursor)
  do {
    let q = supabase
      .from('attempts')
      .select(columns)
      .eq('user_id', member.student_id)
      .gte('created_at', member.joined_at)
    if (scan.last) q = q.or(historyCursorFilter(scan.last))
    const { data, error } = await q
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(HISTORY_SCAN_BATCH)
    if (error) throw new Error(`attempts: ${error.message}`)
    const batch = ((data ?? []) as unknown as AttemptRow[]).map(toClassroomAttempt)
    await attachSchemes(admin, batch)
    const inScope = new Set(
      scopeClassroomAttempts(batch, [member], { subjectCode: classroom.subject_code }).map((a) => a.id)
    )
    scan = advanceHistoryScan(scan, batch, {
      requested: HISTORY_SCAN_BATCH,
      pageSize: HISTORY_PAGE_SIZE,
      keep: (a) => inScope.has(a.id),
    })
  } while (historyScanContinues(scan))

  const ids = scan.rows.map((a) => a.id)
  const itemIds = [...new Set(scan.rows.map((a) => a.assignment_item_id).filter((v): v is string => !!v))]
  const [decisions, sets] = await Promise.all([loadDecisions(supabase, ids), loadItemSets(supabase, itemIds)])

  return {
    attempts: scan.rows.map((a) =>
      toHistoryRow(a, {
        decision: decisions.get(a.id) ?? null,
        set: a.assignment_item_id ? (sets.get(a.assignment_item_id) ?? null) : null,
      })
    ),
    next_cursor: nextHistoryCursor(scan),
  }
}

/** The teacher's own latest decision per attempt (RLS: teacher_id = caller). */
async function loadDecisions(
  supabase: SupabaseClient,
  attemptIds: readonly string[]
): Promise<Map<string, { decision: ReviewDecision; created_at: string }>> {
  const rows: Array<{ id: string; attempt_id: string; decision: ReviewDecision; created_at: string }> = []
  for (const part of chunk([...attemptIds])) {
    const { rows: got } = await fetchAllFiltered<(typeof rows)[number]>('teacher_overrides', (from, to) =>
      supabase
        .from('teacher_overrides')
        .select('id, attempt_id, decision, created_at')
        .in('attempt_id', part)
        .order('id')
        .range(from, to)
    )
    rows.push(...got)
  }
  return latestDecisions(rows)
}

/** item id → the teacher's set it belongs to (RLS: the caller's own sets only). */
async function loadItemSets(
  supabase: SupabaseClient,
  itemIds: readonly string[]
): Promise<Map<string, NonNullable<StudentHistoryRow['set']>>> {
  const out = new Map<string, NonNullable<StudentHistoryRow['set']>>()
  if (itemIds.length === 0) return out
  const itemToSet = new Map<string, string>()
  for (const part of chunk([...itemIds])) {
    const { data, error } = await supabase.from('assignment_items').select('id, assignment_id').in('id', part)
    if (error) throw new Error(`assignment_items: ${error.message}`)
    for (const r of (data ?? []) as Array<{ id: string; assignment_id: string }>) itemToSet.set(r.id, r.assignment_id)
  }
  const setIds = [...new Set(itemToSet.values())]
  const sets = new Map<string, { id: string; classroom_id: string; title: string }>()
  for (const part of chunk(setIds)) {
    const { data, error } = await supabase.from('assignments').select('id, classroom_id, title').in('id', part)
    if (error) throw new Error(`assignments: ${error.message}`)
    for (const r of (data ?? []) as Array<{ id: string; classroom_id: string; title: string }>) sets.set(r.id, r)
  }
  for (const [itemId, setId] of itemToSet) {
    const set = sets.get(setId)
    if (set) out.set(itemId, set)
  }
  return out
}

/**
 * One of this student's in-scope attempts in this class, as a history row
 * (for the note composer's "which script" line), or null when `attemptId`
 * is not theirs, not in the class subject, from before they joined, or the
 * student is no longer an active member. Read through the teacher's RLS
 * client, so another teacher's student is null too.
 */
export async function findStudentAttemptInScope(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: ClassScope,
  member: ClassroomMember,
  attemptId: string
): Promise<StudentHistoryRow | null> {
  if (!isUuid(attemptId) || classroom.archived_at || member.status !== 'active') return null
  const { data, error } = await supabase
    .from('attempts')
    .select(attemptColumns(false))
    .eq('id', attemptId.toLowerCase())
    .eq('user_id', member.student_id)
    .maybeSingle()
  if (error) throw new Error(`attempts: ${error.message}`)
  if (!data) return null
  const attempt = toClassroomAttempt(data as unknown as AttemptRow)
  await attachSchemes(admin, [attempt])
  const [scoped] = scopeClassroomAttempts([attempt], [member], { subjectCode: classroom.subject_code })
  return scoped ? toHistoryRow(scoped) : null
}

// ---------------------------------------------------------------------------
// One student's sets
// ---------------------------------------------------------------------------

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const ITEM_COLUMNS =
  'id, assignment_id, position, item_type, mark_scheme_id, paper_code, paper_session, question_number, total_marks, syllabus_tags, topic_code, prompt_text, ib_component_key'
const FLAG_COLUMNS = 'assignment_id, student_id, excused_at, extended_due_at, feedback, feedback_at, reminded_at'
const SUBMISSION_COLUMNS =
  'id, assignment_id, item_id, student_id, attempt_id, attempt_count, marks_earned, total_marks, status, source, first_submitted_at, last_submitted_at'

/**
 * The class's published sets with THIS student's flags and hand-ins only —
 * never the class's (hydrateSets would read every student's). `db` is the
 * teacher's RLS client, or the service client for an archived class, whose
 * retained hand-ins RLS no longer returns (pass it only after proving
 * ownership).
 */
export async function loadStudentSets(
  db: SupabaseClient,
  classroomId: string,
  studentId: string
): Promise<RecordSet[]> {
  const sets = await loadPublishedSets(db, [classroomId])
  if (sets.length === 0) return []
  const ids = sets.map((s) => s.id)
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
          .eq('student_id', studentId)
          .order('assignment_id')
          .range(from, to)
      ),
      fetchAllFiltered<AssignmentSubmission>('assignment_submissions', (from, to) =>
        db
          .from('assignment_submissions')
          .select(SUBMISSION_COLUMNS)
          .in('assignment_id', part)
          .eq('student_id', studentId)
          .order('id')
          .range(from, to)
      ),
    ])
    for (const r of itemRows.rows) items.get(r.assignment_id)?.push({ ...r, total_marks: num(r.total_marks) })
    for (const r of flagRows.rows) flags.get(r.assignment_id)?.push(r)
    for (const r of submissionRows.rows) {
      submissions.get(r.assignment_id)?.push({ ...r, marks_earned: num(r.marks_earned), total_marks: num(r.total_marks) })
    }
  }
  return sets.map((s) => ({
    id: s.id,
    classroom_id: s.classroom_id,
    title: s.title,
    kind: s.kind,
    is_mock: s.is_mock,
    target: s.target,
    due_at: s.due_at,
    published_at: s.published_at,
    closed_at: s.closed_at,
    archived_at: s.archived_at,
    items: items.get(s.id) ?? [],
    flags: flags.get(s.id) ?? [],
    submissions: submissions.get(s.id) ?? [],
  }))
}

/** One set's items in position order (RLS: the caller's own sets), for the Gaps page's set view. */
export async function loadSetItems(supabase: SupabaseClient, setId: string): Promise<AssignmentItem[]> {
  if (!isUuid(setId)) return []
  const { data, error } = await supabase
    .from('assignment_items')
    .select(ITEM_COLUMNS)
    .eq('assignment_id', setId.toLowerCase())
    .order('position')
  if (error) throw new Error(`assignment_items: ${error.message}`)
  return ((data ?? []) as AssignmentItem[]).map((r) => ({ ...r, total_marks: num(r.total_marks) }))
}

// ---------------------------------------------------------------------------
// Notes and the audit trail
// ---------------------------------------------------------------------------

/** The teacher's own notes on one script (RLS: teacher_id = caller), newest first. */
export async function loadFeedbackNotes(supabase: SupabaseClient, attemptId: string): Promise<FeedbackNote[]> {
  const { data, error } = await supabase
    .from('teacher_feedback')
    .select('id, body, created_at, read_at')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`teacher_feedback: ${error.message}`)
  return (data ?? []) as FeedbackNote[]
}

/**
 * Writes `view_student` for a teacher opening a student's record — at most
 * once per viewing session (viewAuditDue): the last row from this teacher
 * about this student in this class is checked first, server-side. If that
 * check fails, the row is written anyway; a duplicate audit row is harmless,
 * a missing one is not. Never throws.
 */
export async function auditStudentView(entry: {
  actorId: string
  classroomId: string
  studentId: string
  surface: 'student_page' | 'history'
}): Promise<void> {
  try {
    const admin = createServiceClient()
    const { data, error } = await admin
      .from('teacher_audit_log')
      .select('created_at')
      .eq('student_id', entry.studentId)
      .eq('actor_id', entry.actorId)
      .eq('classroom_id', entry.classroomId)
      .eq('action', 'view_student')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) console.error('[teacher/audit] view lookup failed:', error.message)
    const last = error ? null : ((data as { created_at?: string } | null)?.created_at ?? null)
    if (!viewAuditDue(last, Date.now())) return
    await auditLog({
      actorId: entry.actorId,
      classroomId: entry.classroomId,
      studentId: entry.studentId,
      action: 'view_student',
      meta: { surface: entry.surface },
    })
  } catch (err) {
    console.error('[teacher/audit] view_student failed:', err instanceof Error ? err.message : err)
  }
}
