import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isUniqueViolation } from '@/lib/marking/mark-run-errors'
import { assignmentStatus, studentAssignmentStatus, studentCloseAt } from '@/lib/teacher/assignment-status'
import { buildCohortGapReport, headlineGap, type CohortGapReport, type GapAttempt, type MarkPoint, type MarkTypeGap } from '@/lib/teacher/cohort-gaps'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { notifyRemind, notifySubmission } from '@/lib/teacher/notify'
import { legacyItemKey } from '@/lib/teacher/reconcile-keys'
import type {
  Assignment,
  AssignmentDraftInput,
  AssignmentItem,
  AssignmentProgress,
  AssignmentStudentFlags,
  AssignmentSubmission,
  AssignmentSummary,
} from '@/lib/teacher/types'
import { summariseSet } from '@/lib/teacher/week'
import {
  chunk,
  fetchAllFiltered,
  getClassroomMembers,
  getClassroomScope,
  getRosterProfiles,
  hydrateSets,
  type PageQuery,
  type SetRow,
} from '@/lib/teacher-classroom-data'
import { buildAssignmentPrintModel, type AssignmentPrintModel } from '@/lib/teacher/assignments/print-model'
import {
  buildAssignmentProgress,
  buildItemGaps,
  remindRetryAfterMs,
  studentsToRemind,
  type ItemGap,
} from '@/lib/teacher/assignments/progress'
import {
  RECONCILE_ATTEMPT_COLUMNS,
  RECONCILE_MIN_INTERVAL_MS,
  cellAttemptIds,
  collectSubmissionCells,
  isNewOrImproved,
  mergeSubmission,
  planSubmissionResync,
  planSubmissions,
  reconcileIsFresh,
  reviewedAttemptIds,
  submissionChanged,
  type DecisionRow,
  type ReconcileAttemptRow,
  type RosterEntry,
  type SubmissionPlan,
  type SubmissionWrite,
} from '@/lib/teacher/assignments/reconcile'
import { AssignmentInputError, resolveItems, type ResolvedItem } from '@/lib/teacher/assignments/resolve-items'
import { clampListLimit, decodeListCursor, pageSets, type ListStatus } from '@/lib/teacher/assignments/list'
import {
  DUE_PAST_TOLERANCE_MS,
  isUuid,
  mergeAssignmentSettings,
  parseAssignmentDraft,
  type AssignmentPatch,
  type NormalizedDraft,
  type StudentFlagsPatch,
} from '@/lib/teacher/assignments/validate'
import { parseAssignmentItemId } from '@/lib/teacher/assignments/link'

/**
 * Teacher sets: reading, writing and handing work in
 * (docs/TEACHER_SYSTEM_SPEC.md §2.5, §3; CONTRACTS.md §5).
 *
 * Clients, as everywhere in the teacher system:
 *
 *   - `supabase` is the caller's RLS client. Every teacher read and write of
 *     their own sets goes through it, so `assignment_teacher_all` and friends
 *     are the ownership check and a bug here cannot touch another teacher's
 *     class. Routes still prove ownership first (verifyTeacherOwnsClassroom).
 *   - `admin` is the service client, used only where RLS is deliberately
 *     narrower than the job: reading mark_schemes (never the scheme text),
 *     writing assignment_submissions (service-only by design), reconciling
 *     students' attempts, and reading an ARCHIVED class's retained hand-ins.
 *     It is only ever passed in after the caller proved who it is.
 *
 * The rules live in the pure modules beside this file
 * (lib/teacher/assignments/*.ts, all tested): validate (input), resolve-items
 * (what a pick becomes), list (tabs and cursors), progress (the matrix),
 * reconcile (what counts as a hand-in), link (the /mark round trip) and
 * print-model (the handout).
 */

export { AssignmentInputError, resolveItems } from '@/lib/teacher/assignments/resolve-items'
export {
  studentMarkHref,
  assignmentReturnPath,
  planSingleQuestionLink,
  planWholePaperLink,
  markAssignmentLink,
  type MarkAssignmentLink,
} from '@/lib/teacher/assignments/link'

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export const ASSIGNMENT_COLUMNS =
  'id, classroom_id, teacher_id, title, instructions, kind, subject_code, is_mock, source, source_ref, target, due_at, published_at, closed_at, archived_at, reconciled_at, settings, created_at, updated_at'
export const ITEM_COLUMNS =
  'id, assignment_id, position, item_type, mark_scheme_id, paper_code, paper_session, question_number, total_marks, syllabus_tags, topic_code, prompt_text, ib_component_key'
const FLAG_COLUMNS = 'assignment_id, student_id, excused_at, extended_due_at, feedback, feedback_at, reminded_at'
const SUBMISSION_COLUMNS =
  'id, assignment_id, item_id, student_id, attempt_id, attempt_count, marks_earned, total_marks, status, source, first_submitted_at, last_submitted_at'
/** What listing needs of every set to filter, sort and summarise it. */
const LIST_COLUMNS =
  'id, classroom_id, title, kind, subject_code, is_mock, target, due_at, published_at, closed_at, archived_at, created_at, updated_at'

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

/** A row as PostgREST returns it → Assignment, with settings reduced to known keys. */
export function toAssignment(row: Record<string, unknown>): Assignment {
  const settings = plainObject(row.settings) ?? {}
  return {
    ...(row as unknown as Assignment),
    source_ref: plainObject(row.source_ref),
    settings: mergeAssignmentSettings(
      {
        timed_minutes: typeof settings.timed_minutes === 'number' ? settings.timed_minutes : undefined,
        allow_late: typeof settings.allow_late === 'boolean' ? settings.allow_late : undefined,
      },
      {}
    ),
  }
}

export function toItem(row: Record<string, unknown>): AssignmentItem {
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

async function readItems(db: SupabaseClient, assignmentId: string): Promise<AssignmentItem[]> {
  // At most MAX_ITEMS rows: one plain read.
  const { data, error } = await db
    .from('assignment_items')
    .select(ITEM_COLUMNS)
    .eq('assignment_id', assignmentId)
    .order('position')
  if (error) throw new Error(`assignment_items: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(toItem)
}

async function readFlags(db: SupabaseClient, assignmentId: string): Promise<AssignmentStudentFlags[]> {
  const { rows } = await fetchAllFiltered<AssignmentStudentFlags>('assignment_students', (from, to) =>
    db.from('assignment_students').select(FLAG_COLUMNS).eq('assignment_id', assignmentId).order('student_id').range(from, to)
  )
  return rows
}

async function readSubmissions(db: SupabaseClient, assignmentId: string): Promise<AssignmentSubmission[]> {
  const { rows } = await fetchAllFiltered<Record<string, unknown>>('assignment_submissions', (from, to) =>
    db.from('assignment_submissions').select(SUBMISSION_COLUMNS).eq('assignment_id', assignmentId).order('id').range(from, to)
  )
  return rows.map(toSubmission)
}

async function readAssignment(db: SupabaseClient, assignmentId: string): Promise<Assignment | null> {
  const { data, error } = await db.from('assignments').select(ASSIGNMENT_COLUMNS).eq('id', assignmentId).maybeSingle()
  if (error) throw new Error(`assignments: ${error.message}`)
  return data ? toAssignment(data as Record<string, unknown>) : null
}

// ---------------------------------------------------------------------------
// GET T/assignments
// ---------------------------------------------------------------------------

/**
 * One page of a class's sets as slips (AssignmentSummary), newest-relevant
 * first per tab (see lib/teacher/assignments/list.ts). Counts come from the
 * same summariseSet the week view uses. For an ARCHIVED class pass `admin`:
 * its hand-ins are only readable as the service role.
 *
 * Throws AssignmentInputError (field `cursor`) for a cursor that is not this
 * tab's.
 */
export async function listAssignments(
  supabase: SupabaseClient,
  classroomId: string,
  opts: { status?: ListStatus; cursor?: string | null; limit?: number; admin?: SupabaseClient; now?: Date } = {}
): Promise<{ assignments: AssignmentSummary[]; next_cursor: string | null }> {
  const now = opts.now ?? new Date()
  const scope = opts.status ?? 'all'
  const cursor = opts.cursor ? decodeListCursor(opts.cursor, scope) : null
  if (opts.cursor && !cursor) {
    throw new AssignmentInputError('That page of the list has expired — reload it.', 'cursor')
  }

  const classroom = await getClassroomScope(supabase, classroomId)
  if (!classroom) return { assignments: [], next_cursor: null }

  const { rows } = await fetchAllFiltered<SetRow & { updated_at: string }>('assignments', (from, to) =>
    supabase
      .from('assignments')
      .select(LIST_COLUMNS)
      .eq('classroom_id', classroomId)
      .is('archived_at', null)
      .order('id')
      .range(from, to)
  )
  const { page, next_cursor } = pageSets(rows, {
    status: opts.status,
    cursor,
    limit: opts.limit ?? clampListLimit(null),
    now,
  })
  if (page.length === 0) return { assignments: [], next_cursor: null }

  const setsDb = classroom.archived_at !== null && opts.admin ? opts.admin : supabase
  const [sets, members] = await Promise.all([hydrateSets(setsDb, page), getClassroomMembers(supabase, classroomId)])
  const noNames = new Map<string, string | null>()
  return { assignments: sets.map((s) => summariseSet(s, members, noNames, now)), next_cursor }
}

// ---------------------------------------------------------------------------
// POST T/assignments
// ---------------------------------------------------------------------------

export type CreateContext = { classroomId: string; teacherId: string; subjectCode: string | null }

/** Active members of the class among `ids` (RLS: the teacher reads their own class's memberships). */
async function activeMembersAmong(
  supabase: SupabaseClient,
  classroomId: string,
  ids: readonly string[]
): Promise<Set<string>> {
  const found = new Set<string>()
  for (const part of chunk(ids)) {
    const { data, error } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId)
      .eq('status', 'active')
      .in('student_id', part)
    if (error) throw new Error(`classroom_memberships: ${error.message}`)
    for (const r of (data ?? []) as Array<{ student_id: string }>) found.add(r.student_id)
  }
  return found
}

function itemInsertRows(assignmentId: string, items: readonly ResolvedItem[]) {
  return items.map((item, i) => ({ ...item, position: i, assignment_id: assignmentId }))
}

/**
 * Create a set with its items (and its targeted students), published now
 * when `publish` is true. Returns the stored rows.
 *
 * PostgREST has no multi-statement transaction, so the set row goes first
 * — as a draft — and is deleted again (items and targets cascade) if anything
 * after it fails: a teacher never ends up with half a set. Publishing is the
 * last write, so no student ever sees a published set without its items or
 * before its target list is complete.
 *
 * Throws AssignmentInputError for anything to put right in the composer.
 * The caller fans out the publish notification (notifyAssignmentPublished).
 */
export async function createAssignmentWithItems(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  ctx: CreateContext,
  input: AssignmentDraftInput | NormalizedDraft,
  now: Date = new Date()
): Promise<{ assignment: Assignment; items: AssignmentItem[] }> {
  const parsed = parseAssignmentDraft(input, now)
  if (!parsed.ok) throw new AssignmentInputError(parsed.error, parsed.field, parsed.status ?? 400)
  const draft = parsed.value
  if (!ctx.subjectCode) {
    throw new AssignmentInputError(
      'Choose this class’s subject in Settings before setting work.',
      'subject_code',
      409
    )
  }

  let targeted: string[] = []
  if (draft.target !== 'all') {
    const active = await activeMembersAmong(supabase, ctx.classroomId, draft.target.student_ids)
    if (draft.target.student_ids.some((id) => !active.has(id))) {
      throw new AssignmentInputError('One of the picked students is no longer in this class.', 'target')
    }
    targeted = draft.target.student_ids
  }

  const resolved = await resolveItems(admin, ctx.subjectCode, draft.items)

  const { data: created, error: createError } = await supabase
    .from('assignments')
    .insert({
      classroom_id: ctx.classroomId,
      teacher_id: ctx.teacherId,
      title: draft.title,
      instructions: draft.instructions,
      kind: draft.kind,
      subject_code: ctx.subjectCode,
      is_mock: draft.is_mock,
      source: draft.source,
      source_ref: draft.source_ref,
      target: draft.target === 'all' ? 'all' : 'students',
      due_at: draft.due_at,
      published_at: null,
      settings: mergeAssignmentSettings({}, draft.settings),
    })
    .select(ASSIGNMENT_COLUMNS)
    .single()
  if (createError || !created) throw new Error(`assignments insert: ${createError?.message ?? 'no row'}`)
  let assignment = toAssignment(created as Record<string, unknown>)

  try {
    let items: AssignmentItem[] = []
    if (resolved.length > 0) {
      const { data, error } = await supabase
        .from('assignment_items')
        .insert(itemInsertRows(assignment.id, resolved))
        .select(ITEM_COLUMNS)
      if (error) throw new Error(`assignment_items insert: ${error.message}`)
      items = ((data ?? []) as Record<string, unknown>[]).map(toItem).sort((a, b) => a.position - b.position)
    }
    if (targeted.length > 0) {
      for (const part of chunk(targeted, 500)) {
        const { error } = await supabase
          .from('assignment_students')
          .insert(part.map((student_id) => ({ assignment_id: assignment.id, student_id })))
        if (error) throw new Error(`assignment_students insert: ${error.message}`)
      }
    }
    if (draft.publish) {
      const { data, error } = await supabase
        .from('assignments')
        .update({ published_at: now.toISOString() })
        .eq('id', assignment.id)
        .select(ASSIGNMENT_COLUMNS)
        .single()
      if (error || !data) throw new Error(`assignments publish: ${error?.message ?? 'no row'}`)
      assignment = toAssignment(data as Record<string, unknown>)
    }
    return { assignment, items }
  } catch (err) {
    const { error: undoError } = await supabase.from('assignments').delete().eq('id', assignment.id)
    if (undoError) {
      console.error('[teacher/assignments] could not remove a half-created set', {
        assignmentId: assignment.id,
        error: undoError.message,
      })
    }
    throw err
  }
}

/** §2.5 `createAssignment` — the set row; see createAssignmentWithItems. */
export async function createAssignment(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  ctx: CreateContext,
  input: AssignmentDraftInput
): Promise<Assignment> {
  return (await createAssignmentWithItems(supabase, admin, ctx, input)).assignment
}

// ---------------------------------------------------------------------------
// GET T/assignments/[aid]
// ---------------------------------------------------------------------------

/**
 * A set with its items and progress (the completion matrix), or null when the
 * caller cannot see it. Hand-ins are read with the RLS client, so a student
 * who left or was removed shows LEFT with nothing behind it (spec §8, fails
 * closed); in an ARCHIVED class they are read with `admin`, because there the
 * retained hand-ins are all there is to show.
 *
 * Call reconcileAssignment first when the view should include marks made
 * from plain /mark (the set page does).
 */
export async function loadAssignment(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  assignmentId: string
): Promise<{ assignment: Assignment; items: AssignmentItem[]; progress: AssignmentProgress } | null> {
  const assignment = await readAssignment(supabase, assignmentId)
  if (!assignment) return null
  const classroom = await getClassroomScope(supabase, assignment.classroom_id)
  if (!classroom) return null
  const handInsDb = classroom.archived_at !== null ? admin : supabase

  const [items, flags, submissions, members, roster] = await Promise.all([
    readItems(supabase, assignment.id),
    readFlags(supabase, assignment.id),
    readSubmissions(handInsDb, assignment.id),
    getClassroomMembers(supabase, assignment.classroom_id),
    getRosterProfiles(supabase, assignment.classroom_id),
  ])
  const progress = buildAssignmentProgress({
    assignment,
    items,
    members,
    flags,
    submissions,
    names: new Map(roster.map((r) => [r.id, r.full_name])),
  })
  return { assignment, items, progress }
}

// ---------------------------------------------------------------------------
// PATCH / DELETE T/assignments/[aid]
// ---------------------------------------------------------------------------

/**
 * Apply a parsed PATCH. Items (drafts only — the parser refuses them on a
 * published set) are replaced wholesale: the old rows are deleted and the new
 * ones inserted, and if the insert fails the old rows are put back.
 */
export async function updateAssignment(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  assignment: Assignment,
  patch: AssignmentPatch
): Promise<{ assignment: Assignment; items: AssignmentItem[] }> {
  if (patch.items) {
    const resolved = await resolveItems(admin, assignment.subject_code, patch.items)
    // Re-read just before replacing: a second tab may have published the draft
    // since this request loaded it, and a published set's items are fixed.
    const fresh = await readAssignment(supabase, assignment.id)
    if (!fresh || fresh.published_at || assignment.published_at) {
      throw new AssignmentInputError('Items cannot change once a set is published.', 'items', 409)
    }
    const previous = await readItems(supabase, assignment.id)
    const { error: deleteError } = await supabase.from('assignment_items').delete().eq('assignment_id', assignment.id)
    if (deleteError) throw new Error(`assignment_items delete: ${deleteError.message}`)
    if (resolved.length > 0) {
      const { error: insertError } = await supabase
        .from('assignment_items')
        .insert(itemInsertRows(assignment.id, resolved))
      if (insertError) {
        if (previous.length > 0) {
          const { error: restoreError } = await supabase.from('assignment_items').insert(previous)
          if (restoreError) {
            console.error('[teacher/assignments] could not restore a draft’s items', {
              assignmentId: assignment.id,
              error: restoreError.message,
            })
          }
        }
        throw new Error(`assignment_items insert: ${insertError.message}`)
      }
    }
  }

  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.instructions !== undefined) update.instructions = patch.instructions
  if (patch.due_at !== undefined) update.due_at = patch.due_at
  if (patch.closed_at !== undefined) update.closed_at = patch.closed_at
  if (patch.is_mock !== undefined) update.is_mock = patch.is_mock
  if (patch.settings !== undefined) update.settings = mergeAssignmentSettings(assignment.settings, patch.settings)

  let next = assignment
  if (Object.keys(update).length > 0) {
    const { data, error } = await supabase
      .from('assignments')
      .update(update)
      .eq('id', assignment.id)
      .select(ASSIGNMENT_COLUMNS)
      .single()
    if (error || !data) throw new Error(`assignments update: ${error?.message ?? 'no row'}`)
    next = toAssignment(data as Record<string, unknown>)
  } else if (patch.items) {
    next = (await readAssignment(supabase, assignment.id)) ?? assignment
  }
  return { assignment: next, items: await readItems(supabase, assignment.id) }
}

/**
 * Soft-delete (spec §3: DELETE → archived_at). The set leaves every tab and
 * every student's list; its rows and hand-ins stay. Idempotent.
 */
export async function archiveAssignment(
  supabase: SupabaseClient,
  assignment: Assignment,
  now: Date = new Date()
): Promise<Assignment> {
  if (assignment.archived_at) return assignment
  const { data, error } = await supabase
    .from('assignments')
    .update({ archived_at: now.toISOString() })
    .eq('id', assignment.id)
    .is('archived_at', null)
    .select(ASSIGNMENT_COLUMNS)
    .maybeSingle()
  if (error) throw new Error(`assignments archive: ${error.message}`)
  return data ? toAssignment(data as Record<string, unknown>) : ((await readAssignment(supabase, assignment.id)) ?? assignment)
}

// ---------------------------------------------------------------------------
// POST T/assignments/[aid]/publish
// ---------------------------------------------------------------------------

/**
 * Publish a draft now. `published` is false when it already was (a double
 * click, a second tab): the caller fans out only when this call published it,
 * so students are never told twice. The set needs an item, a deadline that
 * has not passed, and — for picked students — somebody still in the class.
 */
export async function publishAssignment(
  supabase: SupabaseClient,
  assignment: Assignment,
  now: Date = new Date()
): Promise<{ assignment: Assignment; published: boolean }> {
  if (assignment.published_at) return { assignment, published: false }
  if (assignment.archived_at) throw new AssignmentInputError('This set was deleted.', 'assignment', 409)

  const items = await readItems(supabase, assignment.id)
  if (items.length === 0) throw new AssignmentInputError('Add at least one item before publishing.', 'items')
  if (assignment.due_at && Date.parse(assignment.due_at) < now.getTime() - DUE_PAST_TOLERANCE_MS) {
    throw new AssignmentInputError('The due date has already passed — change it before publishing.', 'due_at')
  }
  if (assignment.target === 'students') {
    const flags = await readFlags(supabase, assignment.id)
    const active = await activeMembersAmong(
      supabase,
      assignment.classroom_id,
      flags.map((f) => f.student_id)
    )
    if (active.size === 0) {
      throw new AssignmentInputError('None of the picked students is still in this class.', 'target')
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({ published_at: now.toISOString() })
    .eq('id', assignment.id)
    .is('published_at', null)
    .select(ASSIGNMENT_COLUMNS)
    .maybeSingle()
  if (error) throw new Error(`assignments publish: ${error.message}`)
  if (!data) {
    // Someone else published it between the read and the write.
    return { assignment: (await readAssignment(supabase, assignment.id)) ?? assignment, published: false }
  }
  return { assignment: toAssignment(data as Record<string, unknown>), published: true }
}

// ---------------------------------------------------------------------------
// POST T/assignments/[aid]/remind
// ---------------------------------------------------------------------------

/**
 * Remind students who still owe work on an open set — the picked ones, or all
 * of them. Once per set per six hours (the latest assignment_students
 * .reminded_at), throttled with a 429 AssignmentInputError carrying
 * retryAfterSeconds. Plain /mark hand-ins are reconciled first, so nobody who
 * did the work is nagged for it.
 *
 * Returns `{ sent }` from notifyRemind (how many were actually reminded) and
 * `eligible` (how many owed work). notifyRemind stamps reminded_at on the
 * students it reminded, which is what the throttle reads — so a send that
 * reached nobody does not lock the button for six hours. The daily reminder
 * cron stamps the same column, and counts: students who were just reminded
 * are not reminded again within the window.
 */
export async function remindAssignment(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  assignment: Assignment,
  requested: readonly string[] | null,
  now: Date = new Date()
): Promise<{ sent: number; eligible: number }> {
  const status = assignmentStatus(assignment, now)
  if (status === 'draft') throw new AssignmentInputError('Publish the set before reminding anyone.', 'assignment', 409)
  // A set closed for the class is still open to a student whose extension
  // runs past its close (studentAssignmentStatus); only they can be reminded.
  let openTo: Set<string> | null = null
  if (status === 'closed') {
    const flags = await readFlags(supabase, assignment.id)
    openTo = new Set(
      flags
        .filter((f) => !f.excused_at && studentAssignmentStatus(assignment, f.extended_due_at, now) === 'open')
        .map((f) => f.student_id)
    )
    if (openTo.size === 0) throw new AssignmentInputError('This set is closed.', 'assignment', 409)
  }

  const { data: last, error: lastError } = await supabase
    .from('assignment_students')
    .select('reminded_at')
    .eq('assignment_id', assignment.id)
    .not('reminded_at', 'is', null)
    .order('reminded_at', { ascending: false })
    .limit(1)
  if (lastError) throw new Error(`assignment_students: ${lastError.message}`)
  const wait = remindRetryAfterMs((last?.[0] as { reminded_at?: string } | undefined)?.reminded_at ?? null, now)
  if (wait > 0) {
    const hours = Math.ceil(wait / 3_600_000)
    throw new AssignmentInputError(
      `This set was reminded recently. You can remind again in about ${hours} hour${hours === 1 ? '' : 's'}.`,
      'assignment',
      429,
      Math.ceil(wait / 1000)
    )
  }

  try {
    await reconcileAssignment(admin, assignment.id, { now })
  } catch (err) {
    console.error('[teacher/assignments] reconcile before remind failed (reminding anyway)', {
      assignmentId: assignment.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  const loaded = await loadAssignment(supabase, admin, assignment.id)
  if (!loaded) throw new AssignmentInputError('Set not found', 'assignment', 404)

  const { ids: owing, unknown } = studentsToRemind(loaded.progress, requested)
  if (unknown.length > 0) {
    throw new AssignmentInputError('One of the picked students is not on this set.', 'student_ids')
  }
  const ids = openTo ? owing.filter((id) => openTo.has(id)) : owing
  // Never hand notifyRemind an empty list: to it, empty means "everyone".
  if (ids.length === 0) return { sent: 0, eligible: 0 }

  const sent = await notifyRemind(assignment.id, ids)
  return { sent, eligible: ids.length }
}

// ---------------------------------------------------------------------------
// PATCH T/assignments/[aid]/students/[sid]
// ---------------------------------------------------------------------------

/**
 * Excuse, extend or leave a note for one student on a set. The student must
 * be an active member (404 otherwise) and, on a set for picked students, one
 * of them: creating a flags row there would ALSO hand the set to a student it
 * was never for, because that row is what targets them.
 *
 * `feedbackChanged` tells the route to write the audit row.
 */
export async function updateStudentFlags(
  supabase: SupabaseClient,
  assignment: Assignment,
  studentId: string,
  patch: StudentFlagsPatch,
  now: Date = new Date()
): Promise<{ flags: AssignmentStudentFlags; feedbackChanged: boolean }> {
  const active = await activeMembersAmong(supabase, assignment.classroom_id, [studentId])
  if (!active.has(studentId)) throw new AssignmentInputError('That student is not in this class.', 'student', 404)

  const { data: current, error: readError } = await supabase
    .from('assignment_students')
    .select(FLAG_COLUMNS)
    .eq('assignment_id', assignment.id)
    .eq('student_id', studentId)
    .maybeSingle()
  if (readError) throw new Error(`assignment_students: ${readError.message}`)
  const existing = (current as AssignmentStudentFlags | null) ?? null
  if (assignment.target === 'students' && !existing) {
    throw new AssignmentInputError('This set was not given to that student.', 'student', 404)
  }

  const stamp = now.toISOString()
  const row: Record<string, unknown> = { assignment_id: assignment.id, student_id: studentId }
  if (patch.excused !== undefined) row.excused_at = patch.excused ? existing?.excused_at ?? stamp : null
  if (patch.extended_due_at !== undefined) row.extended_due_at = patch.extended_due_at
  let feedbackChanged = false
  if (patch.feedback !== undefined) {
    feedbackChanged = patch.feedback !== (existing?.feedback ?? null)
    row.feedback = patch.feedback
    row.feedback_at = patch.feedback ? (feedbackChanged ? stamp : existing?.feedback_at ?? stamp) : null
  }

  const { data, error } = await supabase
    .from('assignment_students')
    .upsert(row, { onConflict: 'assignment_id,student_id' })
    .select(FLAG_COLUMNS)
    .single()
  if (error || !data) throw new Error(`assignment_students upsert: ${error?.message ?? 'no row'}`)
  return { flags: data as AssignmentStudentFlags, feedbackChanged }
}

// ---------------------------------------------------------------------------
// GET T/assignments/[aid]/gaps
// ---------------------------------------------------------------------------

export type AssignmentGaps = {
  report: CohortGapReport
  headline: MarkTypeGap | null
  per_item: ItemGap[]
  /** Students on the set's roster. */
  students: number
  /** An archived class keeps its marks but not its live scripts (spec conflict rulings). */
  archived: boolean
}

type GapRow = {
  id: string
  user_id: string
  marks_earned: number | string | null
  total_marks: number | string | null
  am_marks?: unknown
  am_style?: string | null
}

/**
 * The cohort gap report over the set's hand-ins — each active student's best
 * attempt per item, not every retry — and the per-item rows for ItemGapList.
 * Attempts are read with the RLS client, so a departed student's scripts are
 * not reachable here even by id.
 */
export async function loadAssignmentGaps(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  assignmentId: string
): Promise<AssignmentGaps | null> {
  const loaded = await loadAssignment(supabase, admin, assignmentId)
  if (!loaded) return null
  const { items, progress, assignment } = loaded
  const classroom = await getClassroomScope(supabase, assignment.classroom_id)
  const archived = !!classroom?.archived_at

  const attemptIds = archived
    ? []
    : progress.students
        .filter((s) => s.membership === 'active')
        .flatMap((s) => s.items.map((i) => i.attempt_id))
        .filter((id): id is string => !!id)

  const byId = new Map<string, GapAttempt>()
  for (const part of chunk([...new Set(attemptIds)])) {
    const { rows } = await fetchAllFiltered<GapRow>('attempts', (from, to) =>
      supabase
        .from('attempts')
        .select('id, user_id, marks_earned, total_marks, am_marks:ai_marking->marks_awarded, am_style:ai_marking->>marking_style')
        .in('id', part)
        .order('id')
        .range(from, to)
    )
    for (const r of rows) {
      byId.set(r.id, {
        user_id: r.user_id,
        marks_earned: num(r.marks_earned),
        total_marks: num(r.total_marks),
        ai_marking: {
          marks_awarded: Array.isArray(r.am_marks) ? (r.am_marks as MarkPoint[]) : null,
          marking_style: r.am_style ?? null,
        },
      })
    }
  }

  const report = buildCohortGapReport([...byId.values()])
  return {
    report,
    headline: headlineGap(report),
    per_item: buildItemGaps(items, progress, byId),
    students: progress.total_students,
    archived,
  }
}

// ---------------------------------------------------------------------------
// .../assignments/[aid]/print
// ---------------------------------------------------------------------------

/**
 * The printable handout, or null when the caller cannot see the set. Question
 * texts come from mark_schemes through `admin` — the text only, never the
 * scheme — after the RLS read of the set proved it is the caller's.
 */
export async function loadAssignmentPrint(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  assignmentId: string
): Promise<AssignmentPrintModel | null> {
  const assignment = await readAssignment(supabase, assignmentId)
  if (!assignment) return null
  const [{ data: classroom, error: classError }, items] = await Promise.all([
    supabase.from('classrooms').select('name, invite_code').eq('id', assignment.classroom_id).maybeSingle(),
    readItems(supabase, assignment.id),
  ])
  if (classError) throw new Error(`classrooms: ${classError.message}`)
  if (!classroom) return null

  const schemeIds = [...new Set(items.map((i) => i.mark_scheme_id).filter((id): id is string => !!id))]
  const questionTexts = new Map<string, string | null>()
  if (schemeIds.length > 0) {
    const { data, error } = await admin.from('mark_schemes').select('id, question_text').in('id', schemeIds)
    if (error) throw new Error(`mark_schemes: ${error.message}`)
    for (const r of (data ?? []) as Array<{ id: string; question_text: string | null }>) {
      questionTexts.set(r.id, r.question_text)
    }
  }
  const c = classroom as { name: string; invite_code: string | null }
  return buildAssignmentPrintModel({
    assignment,
    classroom: { name: c.name, invite_code: c.invite_code },
    items,
    questionTexts,
  })
}

// ---------------------------------------------------------------------------
// Hand-ins: writing assignment_submissions
// ---------------------------------------------------------------------------

async function readSubmission(
  admin: SupabaseClient,
  itemId: string,
  studentId: string
): Promise<AssignmentSubmission | null> {
  const { data, error } = await admin
    .from('assignment_submissions')
    .select(SUBMISSION_COLUMNS)
    .eq('item_id', itemId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(`assignment_submissions: ${error.message}`)
  return data ? toSubmission(data as Record<string, unknown>) : null
}

const WRITE_ATTEMPTS = 3

/**
 * Write one planned row with optimistic concurrency. Inserting races on the
 * (item_id, student_id) unique key; updating is conditional on the row still
 * being what the plan was computed from (status, attempt, count, last hand-in).
 * When another writer got there first — the marking hook and a teacher's
 * reconcile, or an override marking it reviewed — the row is re-read and
 * re-planned against theirs, so neither write is lost.
 *
 * Returns the row written and the one it replaced, or null when there was
 * nothing left to change.
 */
async function writeSubmission(
  admin: SupabaseClient,
  plan: Pick<SubmissionPlan, 'existing' | 'next'>,
  replan: (fresh: AssignmentSubmission | null) => SubmissionWrite | null
): Promise<{ previous: AssignmentSubmission | null; row: SubmissionWrite } | null> {
  let existing = plan.existing
  let next = plan.next
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    if (!existing) {
      const { error } = await admin.from('assignment_submissions').insert(next)
      if (!error) return { previous: null, row: next }
      if (!isUniqueViolation(error)) throw new Error(`assignment_submissions insert: ${error.message}`)
    } else {
      let q = admin
        .from('assignment_submissions')
        .update(next)
        .eq('id', existing.id)
        .eq('status', existing.status)
        .eq('attempt_count', existing.attempt_count)
        .eq('last_submitted_at', existing.last_submitted_at)
      q = existing.attempt_id ? q.eq('attempt_id', existing.attempt_id) : q.is('attempt_id', null)
      const { data, error } = await q.select('id')
      if (error) throw new Error(`assignment_submissions update: ${error.message}`)
      if (data && data.length > 0) return { previous: existing, row: next }
    }
    const fresh = await readSubmission(admin, next.item_id, next.student_id)
    const again = replan(fresh)
    if (!again || !submissionChanged(fresh, again)) return null
    existing = fresh
    next = again
  }
  console.warn('[teacher/assignments] submission write kept losing races; left for the next reconcile', {
    itemId: next.item_id,
    studentId: next.student_id,
  })
  return null
}

async function writePlans(
  admin: SupabaseClient,
  assignment: Pick<Assignment, 'id' | 'due_at'>,
  plans: readonly SubmissionPlan[],
  reviewed?: ReadonlySet<string>
): Promise<Array<{ previous: AssignmentSubmission | null; row: SubmissionWrite }>> {
  const written: Array<{ previous: AssignmentSubmission | null; row: SubmissionWrite }> = []
  for (const plan of plans) {
    const result = await writeSubmission(admin, plan, (fresh) =>
      mergeSubmission(fresh, plan.matches, {
        assignment,
        item: plan.item,
        studentId: plan.studentId,
        extendedDueAt: plan.extendedDueAt,
        reviewed,
      })
    )
    if (result) written.push(result)
  }
  return written
}

/**
 * The attempts among `attemptIds` whose latest teacher decision is a confirm
 * or an override (reviewedAttemptIds) — what makes a hand-in 'reviewed'.
 */
async function readReviewedAttempts(admin: SupabaseClient, attemptIds: readonly string[]): Promise<Set<string>> {
  const rows: DecisionRow[] = []
  for (const part of chunk([...new Set(attemptIds)])) {
    const { rows: page } = await fetchAllFiltered<DecisionRow>('teacher_overrides', (from, to) =>
      admin
        .from('teacher_overrides')
        .select('id, attempt_id, decision, created_at')
        .in('attempt_id', part)
        .order('id')
        .range(from, to)
    )
    rows.push(...page)
  }
  return reviewedAttemptIds(rows)
}

/**
 * The latest instant any student on `roster` can still hand work in when the
 * set refuses late work: the set's close, or the latest extension past it
 * (studentCloseAt). Null when the set accepts late work or never closes —
 * then there is no upper bound.
 */
function latestRosterClose(
  assignment: Pick<Assignment, 'closed_at' | 'due_at' | 'settings'>,
  extensions: ReadonlyMap<string, string | null>,
  roster: readonly RosterEntry[]
): string | null {
  if (assignment.settings.allow_late !== false) return null
  let latest = studentCloseAt(assignment, null)
  if (latest === null) return null
  for (const r of roster) {
    const close = studentCloseAt(assignment, extensions.get(r.student_id) ?? null)
    if (close !== null && Date.parse(close) > Date.parse(latest)) latest = close
  }
  return latest
}

// ---------------------------------------------------------------------------
// Reconciliation (plain /mark → set)
// ---------------------------------------------------------------------------

/** Rows read per attempts query in a reconcile; a class's work since one set is far below it. */
const RECONCILE_MAX_ATTEMPTS = 5000

/**
 * Every attempt of `studentIds` since `fromIso` (to `toIso`) that could hand
 * in one of `items`: stamped with one of them, on one of their banked
 * questions (or another bank row for the same question), or the same whole
 * paper. Deduplicated by the caller's planner.
 */
async function loadReconcileAttempts(
  admin: SupabaseClient,
  input: { items: readonly AssignmentItem[]; studentIds: readonly string[]; fromIso: string; toIso: string | null }
): Promise<ReconcileAttemptRow[]> {
  const itemIds = input.items.map((i) => i.id)

  // Scheme ids: the items' own, plus every bank row for the same question —
  // an item whose scheme row was deleted, or a question banked twice.
  const schemeIds = new Set(input.items.map((i) => i.mark_scheme_id).filter((id): id is string => !!id))
  const questionItems = input.items.filter((i) => i.item_type === 'past_paper_question')
  const wantedKeys = new Set(questionItems.map((i) => legacyItemKey(i)).filter((k): k is string => !!k))
  if (wantedKeys.size > 0) {
    const codes = [...new Set(questionItems.map((i) => i.paper_code).filter((c): c is string => !!c))]
    const sessions = [...new Set(questionItems.map((i) => i.paper_session).filter((s): s is string => !!s))]
    const { rows } = await fetchAllFiltered<{ id: string; paper_code: string; paper_session: string; question_number: string }>(
      'mark_schemes',
      (from, to) =>
        admin
          .from('mark_schemes')
          .select('id, paper_code, paper_session, question_number')
          .in('paper_code', codes)
          .in('paper_session', sessions)
          .order('id')
          .range(from, to),
      { maxRows: RECONCILE_MAX_ATTEMPTS }
    )
    for (const r of rows) {
      const key = legacyItemKey({
        item_type: 'past_paper_question',
        paper_code: r.paper_code,
        paper_session: r.paper_session,
        question_number: r.question_number,
      })
      if (key && wantedKeys.has(key)) schemeIds.add(r.id)
    }
  }
  const wholePapers = input.items.filter(
    (i) => i.item_type === 'whole_paper' && i.paper_code && i.paper_session
  )

  const out: ReconcileAttemptRow[] = []
  const collect = async (label: string, page: PageQuery) => {
    const { rows, truncated } = await fetchAllFiltered<ReconcileAttemptRow>(label, page, {
      maxRows: RECONCILE_MAX_ATTEMPTS,
    })
    if (truncated) console.warn(`[teacher/assignments] ${label} truncated at ${RECONCILE_MAX_ATTEMPTS} rows`)
    out.push(...rows)
  }

  for (const students of chunk(input.studentIds)) {
    // These students' attempts inside the loosest window; each query below
    // narrows to one way of matching.
    const scoped = () => {
      const q = admin
        .from('attempts')
        .select(RECONCILE_ATTEMPT_COLUMNS)
        .in('user_id', students)
        .gte('created_at', input.fromIso)
      return input.toIso ? q.lte('created_at', input.toIso) : q
    }
    await collect('attempts (stamped)', (from, to) =>
      scoped().in('assignment_item_id', itemIds).order('id').range(from, to)
    )
    for (const schemes of chunk([...schemeIds])) {
      await collect('attempts (scheme)', (from, to) =>
        scoped().in('mark_scheme_id', schemes).order('id').range(from, to)
      )
    }
    for (const paper of wholePapers) {
      await collect('attempts (whole paper)', (from, to) =>
        scoped()
          .is('mark_scheme_id', null)
          .eq('ai_marking->>paper_code', paper.paper_code as string)
          .eq('ai_marking->>paper_session', paper.paper_session as string)
          .order('id')
          .range(from, to)
      )
    }
  }
  return out
}

function laterIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b
}

/**
 * Match the set's students' marks to its items (spec §2.5): what a student
 * marked from plain /mark on the set's question becomes a hand-in here.
 * Skips drafts, deleted sets, archived classes (retained hand-ins only, never
 * live attempts) and — unless `force` — a set reconciled in the last minute.
 *
 * The minute is claimed atomically (a conditional update of reconciled_at),
 * so two tabs opening the set at once reconcile it once. If the work fails,
 * the claim is given back so the next view retries, and the error is thrown
 * for the caller to log. Returns how many submission rows were written.
 */
export async function reconcileAssignment(
  admin: SupabaseClient,
  assignmentId: string,
  opts: { force?: boolean; now?: Date } = {}
): Promise<{ linked: number }> {
  if (!isTeacherV2()) return { linked: 0 }
  const now = opts.now ?? new Date()
  const assignment = await readAssignment(admin, assignmentId)
  if (!assignment || !assignment.published_at || assignment.archived_at) return { linked: 0 }
  if (reconcileIsFresh(assignment.reconciled_at, now, opts.force)) return { linked: 0 }

  const classroom = await getClassroomScope(admin, assignment.classroom_id)
  if (!classroom || classroom.archived_at) return { linked: 0 }

  let claim = admin.from('assignments').update({ reconciled_at: now.toISOString() }).eq('id', assignment.id)
  if (!opts.force) {
    const cutoff = new Date(now.getTime() - RECONCILE_MIN_INTERVAL_MS).toISOString()
    claim = claim.or(`reconciled_at.is.null,reconciled_at.lt."${cutoff}"`)
  }
  const { data: claimed, error: claimError } = await claim.select('id')
  if (claimError) throw new Error(`assignments reconcile claim: ${claimError.message}`)
  if (!claimed || claimed.length === 0) return { linked: 0 }

  try {
    const [items, members, flags, existing] = await Promise.all([
      readItems(admin, assignment.id),
      getClassroomMembers(admin, assignment.classroom_id, { status: ['active'] }),
      readFlags(admin, assignment.id),
      readSubmissions(admin, assignment.id),
    ])
    const targeted = assignment.target === 'students' ? new Set(flags.map((f) => f.student_id)) : null
    const roster: RosterEntry[] = members
      .filter((m) => !targeted || targeted.has(m.student_id))
      .map((m) => ({ student_id: m.student_id, joined_at: m.joined_at }))
    if (items.length === 0 || roster.length === 0) return { linked: 0 }

    // The query's lower bound is the loosest window start; the planner
    // applies each student's own (joined_at) afterwards.
    const published = assignment.published_at
    const fromIso = roster.reduce(
      (earliest, r) => {
        const start = laterIso(r.joined_at, published)
        return Date.parse(start) < Date.parse(earliest) ? start : earliest
      },
      laterIso(roster[0].joined_at, published)
    )
    const extensions = new Map(flags.map((f) => [f.student_id, f.extended_due_at]))
    // The upper bound is the loosest too: a student with an extension past the
    // set's close may still hand in (the planner applies each one's own).
    const toIso = latestRosterClose(assignment, extensions, roster)

    const attempts = await loadReconcileAttempts(admin, {
      items,
      studentIds: roster.map((r) => r.student_id),
      fromIso,
      toIso,
    })
    const input = { assignment, items, roster, extensions, attempts, existing }
    // 'reviewed' follows the counted attempt's latest decision, read here so a
    // reconcile never drops a review a teacher made (or keeps one they took back).
    const reviewed = await readReviewedAttempts(admin, cellAttemptIds(collectSubmissionCells(input)))
    const plans = planSubmissions({ ...input, reviewed })
    const written = await writePlans(admin, assignment, plans, reviewed)
    return { linked: written.length }
  } catch (err) {
    const { error: undoError } = await admin
      .from('assignments')
      .update({ reconciled_at: assignment.reconciled_at })
      .eq('id', assignment.id)
    if (undoError) {
      console.error('[teacher/assignments] could not release the reconcile claim', {
        assignmentId: assignment.id,
        error: undoError.message,
      })
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// The marking hook
// ---------------------------------------------------------------------------

export type MarkedAttempt = {
  id: string
  user_id: string | null
  assignment_item_id: string | null
  mark_scheme_id: string | null
  marks_earned: number | null
  total_marks: number | null
  created_at: string
}

type Membership = { classroom_id: string; joined_at: string }

/** The student's active memberships of non-archived classes. */
async function activeClassMemberships(admin: SupabaseClient, userId: string): Promise<Membership[]> {
  const { data, error } = await admin
    .from('classroom_memberships')
    .select('classroom_id, joined_at')
    .eq('student_id', userId)
    .eq('status', 'active')
  if (error) throw new Error(`classroom_memberships: ${error.message}`)
  const memberships = (data ?? []) as Membership[]
  if (memberships.length === 0) return []
  const { data: live, error: classError } = await admin
    .from('classrooms')
    .select('id')
    .in(
      'id',
      memberships.map((m) => m.classroom_id)
    )
    .is('archived_at', null)
  if (classError) throw new Error(`classrooms: ${classError.message}`)
  const liveIds = new Set(((live ?? []) as Array<{ id: string }>).map((c) => c.id))
  return memberships.filter((m) => liveIds.has(m.classroom_id))
}

/**
 * The published set items in the student's live classes that `row` answers:
 * the item it was stamped with, and every item on the same banked question.
 * Each comes with its set and when the student joined that set's class.
 */
async function itemsAnsweredBy(
  admin: SupabaseClient,
  row: ReconcileAttemptRow,
  memberships: readonly Membership[]
): Promise<Array<{ assignment: Assignment; item: AssignmentItem; joinedAt: string }>> {
  if (!row.user_id || memberships.length === 0) return []
  const stampedId = isUuid(row.assignment_item_id) ? row.assignment_item_id : null
  const schemeId = isUuid(row.mark_scheme_id) ? row.mark_scheme_id : null
  if (!stampedId && !schemeId) return []

  const joinedAt = new Map(memberships.map((m) => [m.classroom_id, m.joined_at]))
  const { rows: setRows } = await fetchAllFiltered<Record<string, unknown>>('assignments', (from, to) =>
    admin
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .in('classroom_id', [...joinedAt.keys()])
      .not('published_at', 'is', null)
      .is('archived_at', null)
      .order('id')
      .range(from, to)
  )
  const sets = new Map(setRows.map((r) => [String(r.id), toAssignment(r)]))
  if (sets.size === 0) return []

  const match = [stampedId ? `id.eq.${stampedId}` : null, schemeId ? `mark_scheme_id.eq.${schemeId}` : null]
    .filter(Boolean)
    .join(',')
  const out: Array<{ assignment: Assignment; item: AssignmentItem; joinedAt: string }> = []
  for (const part of chunk([...sets.keys()])) {
    const { data, error } = await admin
      .from('assignment_items')
      .select(ITEM_COLUMNS)
      .in('assignment_id', part)
      .or(match)
    if (error) throw new Error(`assignment_items: ${error.message}`)
    for (const item of ((data ?? []) as Record<string, unknown>[]).map(toItem)) {
      const assignment = sets.get(item.assignment_id)
      const joined = assignment ? joinedAt.get(assignment.classroom_id) : undefined
      if (assignment && joined) out.push({ assignment, item, joinedAt: joined })
    }
  }
  return out
}

async function readFlagsFor(
  admin: SupabaseClient,
  assignmentId: string,
  studentId: string
): Promise<AssignmentStudentFlags | null> {
  const { data, error } = await admin
    .from('assignment_students')
    .select(FLAG_COLUMNS)
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(`assignment_students: ${error.message}`)
  return (data as AssignmentStudentFlags | null) ?? null
}

/**
 * Hand one freshly marked attempt in against every set item it answers for
 * its author: the item it was stamped with, and any published set in the
 * student's classes that holds the same banked question.
 */
async function linkAttempt(admin: SupabaseClient, row: ReconcileAttemptRow, memberships: readonly Membership[]) {
  if (!row.user_id) return
  const studentId = row.user_id
  for (const { assignment, item, joinedAt } of await itemsAnsweredBy(admin, row, memberships)) {
    const flags = await readFlagsFor(admin, assignment.id, studentId)
    if (assignment.target === 'students' && !flags) continue

    const existing = await readSubmission(admin, item.id, studentId)
    const plans = planSubmissions({
      assignment,
      items: [item],
      roster: [{ student_id: studentId, joined_at: joinedAt }],
      extensions: new Map([[studentId, flags?.extended_due_at ?? null]]),
      attempts: [row],
      existing: existing ? [existing] : [],
    })
    for (const written of await writePlans(admin, assignment, plans)) {
      if (written.row.attempt_id && isNewOrImproved(written.previous, written.row)) {
        await notifySubmission({
          assignmentId: assignment.id,
          studentId: written.row.student_id,
          attemptId: written.row.attempt_id,
        })
      }
    }
  }
}

function logHookFailure(err: unknown, context: Record<string, unknown>) {
  console.error('[teacher/assignments] hand-in hook failed (mark unaffected)', {
    ...context,
    error: err instanceof Error ? err.message : String(err),
  })
}

/**
 * The marking hook (spec §2.5): after a mark is saved, hand it in against the
 * sets it answers. Never throws — it runs after the result has gone to the
 * student and must not be able to fail a mark; anything it misses, the next
 * reconcile of the set picks up. A no-op with TEACHER_V2=0, and for a student
 * in no class it costs one membership read.
 *
 * `attempt` identifies the row; the row itself is re-read so the stamp, the
 * scheme and the marks are the stored ones (an override may already differ).
 */
export async function onAttemptMarked(admin: SupabaseClient, attempt: MarkedAttempt): Promise<void> {
  if (!attempt?.id || !attempt.user_id) return
  await onAttemptsMarked(admin, { userId: attempt.user_id, attemptIds: [attempt.id] })
}

/** onAttemptMarked for several attempts of one student (a multi-question script). */
export async function onAttemptsMarked(
  admin: SupabaseClient,
  input: { userId: string | null; attemptIds: readonly (string | null | undefined)[] }
): Promise<void> {
  if (!isTeacherV2() || !input.userId) return
  const ids = [...new Set(input.attemptIds.filter((id): id is string => isUuid(id)))]
  if (ids.length === 0) return
  try {
    const memberships = await activeClassMemberships(admin, input.userId)
    if (memberships.length === 0) return
    const { data, error } = await admin
      .from('attempts')
      .select(RECONCILE_ATTEMPT_COLUMNS)
      .in('id', ids)
      .eq('user_id', input.userId)
    if (error) throw new Error(`attempts: ${error.message}`)
    for (const row of (data ?? []) as unknown as ReconcileAttemptRow[]) {
      try {
        await linkAttempt(admin, row, memberships)
      } catch (err) {
        logHookFailure(err, { attemptId: row.id })
      }
    }
  } catch (err) {
    logHookFailure(err, { attemptIds: ids })
  }
}

// ---------------------------------------------------------------------------
// After a teacher's decision
// ---------------------------------------------------------------------------

/** A hand-in as it stands after resyncSubmissionsForAttempt. */
export type ResyncedSubmission = Pick<SubmissionWrite, 'assignment_id' | 'item_id' | 'student_id' | 'attempt_id' | 'status'>

function resynced(row: Pick<SubmissionWrite, 'assignment_id' | 'item_id' | 'student_id' | 'attempt_id' | 'status'>): ResyncedSubmission {
  return {
    assignment_id: row.assignment_id,
    item_id: row.item_id,
    student_id: row.student_id,
    attempt_id: row.attempt_id,
    status: row.status,
  }
}

async function readItem(admin: SupabaseClient, itemId: string): Promise<AssignmentItem | null> {
  const { data, error } = await admin.from('assignment_items').select(ITEM_COLUMNS).eq('id', itemId).maybeSingle()
  if (error) throw new Error(`assignment_items: ${error.message}`)
  return data ? toItem(data as Record<string, unknown>) : null
}

/**
 * Recompute one (item, student) hand-in from scratch (planSubmissionResync):
 * every attempt of theirs that could hand the item in, at its current marks,
 * judged exactly as reconcileAssignment judges them. `decided` is the attempt
 * the teacher just decided on, as re-read after the decision.
 */
async function resyncSubmission(
  admin: SupabaseClient,
  itemOrId: AssignmentItem | string,
  studentId: string,
  decided: ReconcileAttemptRow
): Promise<ResyncedSubmission | null> {
  const item = typeof itemOrId === 'string' ? await readItem(admin, itemOrId) : itemOrId
  if (!item) return null
  const assignment = await readAssignment(admin, item.assignment_id)
  if (!assignment) return null

  const [existing, flags, classroom, membershipRes] = await Promise.all([
    readSubmission(admin, item.id, studentId),
    readFlagsFor(admin, assignment.id, studentId),
    getClassroomScope(admin, assignment.classroom_id),
    admin
      .from('classroom_memberships')
      .select('status, joined_at')
      .eq('classroom_id', assignment.classroom_id)
      .eq('student_id', studentId)
      .maybeSingle(),
  ])
  if (membershipRes.error) throw new Error(`classroom_memberships: ${membershipRes.error.message}`)
  const membership = membershipRes.data as { status: string; joined_at: string } | null
  // On the set's roster exactly when reconcileAssignment would reconcile them;
  // otherwise the row is history and only the attempt it holds is re-read.
  const onRoster =
    Boolean(assignment.published_at) &&
    !assignment.archived_at &&
    Boolean(classroom) &&
    !classroom?.archived_at &&
    membership?.status === 'active' &&
    (assignment.target === 'all' || flags !== null)
  const joinedAt = onRoster && membership ? membership.joined_at : null
  const extendedDueAt = flags?.extended_due_at ?? null

  const rows: ReconcileAttemptRow[] = [decided]
  if (joinedAt && assignment.published_at) {
    rows.push(
      ...(await loadReconcileAttempts(admin, {
        items: [item],
        studentIds: [studentId],
        fromIso: laterIso(joinedAt, assignment.published_at),
        toIso: assignment.settings.allow_late === false ? studentCloseAt(assignment, extendedDueAt) : null,
      }))
    )
  }
  if (existing?.attempt_id && !rows.some((r) => r.id === existing.attempt_id)) {
    const { data, error } = await admin
      .from('attempts')
      .select(RECONCILE_ATTEMPT_COLUMNS)
      .eq('id', existing.attempt_id)
      .maybeSingle()
    if (error) throw new Error(`attempts: ${error.message}`)
    if (data) rows.push(data as unknown as ReconcileAttemptRow)
  }
  const reviewed = await readReviewedAttempts(admin, rows.map((r) => r.id))

  const plan = (fresh: AssignmentSubmission | null) =>
    planSubmissionResync({ assignment, item, studentId, joinedAt, extendedDueAt, attempts: rows, existing: fresh, reviewed })
  const next = plan(existing)
  if (!next) return existing ? resynced(existing) : null
  if (!submissionChanged(existing, next)) return resynced(next)
  const written = await writeSubmission(admin, { existing, next }, plan)
  return resynced(written?.row ?? next)
}

/**
 * A teacher confirmed, re-marked or flagged `attemptId` (spec §6 onOverrideSaved):
 * recompute every hand-in the decision bears on — the rows that count the
 * attempt, and every live set item it answers, which a raised mark may now
 * win — with reconciliation's own rules (planSubmissionResync), so the next
 * reconcile of the set agrees and never flips the row back. Each row counts
 * its best attempt at its current marks, and is 'reviewed' when that
 * attempt's latest decision is a confirm or an override.
 *
 * Returns the rows as they now stand. Throws on a database error; the caller
 * (lib/teacher/notify.ts) logs it, and the next reconcile repairs the rows.
 */
export async function resyncSubmissionsForAttempt(
  admin: SupabaseClient,
  attemptId: string
): Promise<ResyncedSubmission[]> {
  if (!isUuid(attemptId)) return []
  const { data, error } = await admin
    .from('attempts')
    .select(RECONCILE_ATTEMPT_COLUMNS)
    .eq('id', attemptId)
    .maybeSingle()
  if (error) throw new Error(`attempts: ${error.message}`)
  const attempt = (data as unknown as ReconcileAttemptRow | null) ?? null
  if (!attempt?.user_id) return []
  const studentId = attempt.user_id

  // Item id → the item when already read. A hand-in always belongs to the
  // attempt's author, so every row here is this student's.
  const targets = new Map<string, AssignmentItem | null>()
  const { data: held, error: heldError } = await admin
    .from('assignment_submissions')
    .select('item_id')
    .eq('attempt_id', attempt.id)
  if (heldError) throw new Error(`assignment_submissions: ${heldError.message}`)
  for (const r of (held ?? []) as Array<{ item_id: string }>) targets.set(r.item_id, null)
  const memberships = await activeClassMemberships(admin, studentId)
  for (const { item } of await itemsAnsweredBy(admin, attempt, memberships)) targets.set(item.id, item)

  const out: ResyncedSubmission[] = []
  for (const [itemId, item] of targets) {
    const row = await resyncSubmission(admin, item ?? itemId, studentId, attempt)
    if (row) out.push(row)
  }
  return out
}

// ---------------------------------------------------------------------------
// The marking routes' gate
// ---------------------------------------------------------------------------

const NOT_AVAILABLE = 'That set isn’t available to you. Open it again from your assignments.'

/**
 * May `studentId` hand work in against `itemId` right now? (spec §3
 * `/api/mark/process`: member, published, not deleted, not closed unless late
 * work is allowed.) Anything a student should not learn about — a set of
 * another class, a draft, an id that does not exist — gets the same answer.
 * `reason` is shown to the student as the 400's error.
 *
 * "Closed" is closed FOR THIS STUDENT (studentAssignmentStatus): an extension
 * past the set's close keeps it open to them until their own deadline.
 *
 * Throws on a database error. The marking routes treat a throw as "could not
 * check" and mark anyway, unlinked — only a definite `{ ok: false }` refuses.
 */
export async function validateAssignmentItemForStudent(
  admin: SupabaseClient,
  itemId: string,
  studentId: string,
  now: Date = new Date()
): Promise<{ ok: true; item: AssignmentItem; assignment: Assignment } | { ok: false; reason: string }> {
  const id = parseAssignmentItemId(itemId)
  if (!id || !studentId) return { ok: false, reason: NOT_AVAILABLE }

  const { data: itemRow, error: itemError } = await admin.from('assignment_items').select(ITEM_COLUMNS).eq('id', id).maybeSingle()
  if (itemError) throw new Error(`assignment_items: ${itemError.message}`)
  if (!itemRow) return { ok: false, reason: NOT_AVAILABLE }
  const item = toItem(itemRow as Record<string, unknown>)

  const assignment = await readAssignment(admin, item.assignment_id)
  if (!assignment || !assignment.published_at) return { ok: false, reason: NOT_AVAILABLE }

  // One round trip for the rest: membership, the class, and the student's own
  // row on the set (targeting and any extension).
  const [
    { data: membership, error: memberError },
    { data: classroom, error: classError },
    { data: flagRow, error: flagError },
  ] = await Promise.all([
    admin
      .from('classroom_memberships')
      .select('status')
      .eq('classroom_id', assignment.classroom_id)
      .eq('student_id', studentId)
      .maybeSingle(),
    admin.from('classrooms').select('archived_at').eq('id', assignment.classroom_id).maybeSingle(),
    admin
      .from('assignment_students')
      .select('student_id, extended_due_at')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .maybeSingle(),
  ])
  if (memberError) throw new Error(`classroom_memberships: ${memberError.message}`)
  if (classError) throw new Error(`classrooms: ${classError.message}`)
  if (flagError) throw new Error(`assignment_students: ${flagError.message}`)
  if (!membership || (membership as { status: string }).status !== 'active' || !classroom) {
    return { ok: false, reason: NOT_AVAILABLE }
  }
  const flags = (flagRow as { student_id: string; extended_due_at: string | null } | null) ?? null
  if (assignment.target === 'students' && !flags) return { ok: false, reason: NOT_AVAILABLE }

  if ((classroom as { archived_at: string | null }).archived_at) {
    return { ok: false, reason: 'Your teacher has archived this class, so it isn’t taking work any more.' }
  }
  if (assignment.archived_at) return { ok: false, reason: 'Your teacher has removed this set.' }
  if (
    assignment.settings.allow_late === false &&
    studentAssignmentStatus(assignment, flags?.extended_due_at ?? null, now) === 'closed'
  ) {
    return { ok: false, reason: 'This set is closed — your teacher isn’t accepting late work on it.' }
  }
  return { ok: true, item, assignment }
}
