import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAfterResponse } from '@/lib/after-response'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import type { TeacherAuditAction } from '@/lib/database.types'
import { buildAssignmentSetEmail, formatDueUtc, oneLine } from '@/lib/email/assignment-set'
import type { SendEmailParams } from '@/lib/email/send'
import {
  buildTeacherFeedbackEmail,
  markChangeText,
  type TeacherFeedbackKind,
} from '@/lib/email/teacher-feedback'
import { createServiceClient } from '@/lib/supabase/service'
import { isLate } from '@/lib/teacher/assignment-status'
import { displayName } from '@/lib/teacher/display-name'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { deferEmails, loadEmailRecipients, loadProfileNames } from '@/lib/teacher/email/recipients'
import { remindStudents } from '@/lib/teacher/reminders'
import type {
  Assignment,
  ClassroomSettings,
  ReviewDecision,
  SubmissionStatus,
} from '@/lib/teacher/types'
import { chunk, fetchAllFiltered, getClassroomMembers } from '@/lib/teacher-classroom-data'

/**
 * Side effects of teacher actions: notifications, emails, submission
 * bookkeeping and the audit trail (docs/TEACHER_SYSTEM_SPEC.md §2.3, §5, §8).
 *
 * The signatures are final; routes in every package call these and must not
 * need to change when the bodies do. Contract for all of them:
 *
 *   - They never throw. A failed email or notification must not turn a saved
 *     override or a published set into a 500; failures are logged here.
 *   - The notification functions are safe to call more than once for the
 *     same event (a retried request, a double click): the rows they write
 *     are keyed so a repeat updates rather than duplicates. auditLog is the
 *     exception by design — it appends one row per call, so call it once per
 *     action, after the action succeeded.
 *   - Callers may await them or hand them to `after()`; nothing the caller
 *     returns depends on their result except notifyRemind's count. Emails are
 *     never sent inline: they go out after the response, 50 per `after()`,
 *     so awaiting a class-wide publish costs the database writes only.
 *
 * Everything runs with the service client, because the people these write
 * to (a teacher's inbox, a student's bell) are not the signed-in caller. The
 * callers have already proven the caller may act (ownership, RLS reads);
 * these functions re-check only what decides WHO is told — published, not
 * archived, active member, targeted, not excused, visible to the student.
 *
 * Email consent, addresses and suppressions: lib/teacher/email/recipients.ts.
 * Names in notifications and emails: displayName() only (spec §8).
 *
 * The TEACHER_V2 kill switch silences every announcement here (notifications
 * and emails). It does not stop the bookkeeping — a reviewed hand-in is still
 * marked reviewed — nor the audit log, which must record what teachers did
 * whether or not the new pages are showing.
 */

export type { TeacherAuditAction }

export type TeacherAuditEntry = {
  actorId: string
  classroomId?: string | null
  studentId?: string | null
  action: TeacherAuditAction
  meta?: Record<string, unknown>
}

const DAY_MS = 86_400_000
/**
 * A student gets at most one teacher-review email per attempt in this window,
 * however many times the teacher re-decides or re-writes a note on it (the
 * bell still shows each). Same idea as the community reply cooldown.
 */
export const REVIEW_EMAIL_COOLDOWN_MS = 15 * 60_000

// ---------------------------------------------------------------------------
// Pure helpers (tested in notify.test.ts)
// ---------------------------------------------------------------------------

/** 00:00 UTC of `now`'s day — the key submission notifications coalesce on. */
export function utcDayStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / DAY_MS) * DAY_MS)
}

/** Where a teacher reads a set's hand-ins. */
export function teacherSetHref(classroomId: string, assignmentId: string): string {
  return `/teacher/classroom/${classroomId}/assignments/${assignmentId}`
}

/** Where a student opens a set. */
export function studentSetHref(assignmentId: string): string {
  return `/dashboard/assignments/${assignmentId}`
}

/** Where a student reads a marked attempt (and the teacher's note on it). */
export function attemptHref(attemptId: string): string {
  return `/dashboard/attempt/${attemptId}`
}

/** `notify_submissions: 'off'` silences hand-in notifications; anything else (default 'daily') is on. */
export function submissionNotificationsOff(settings: ClassroomSettings | null | undefined): boolean {
  return settings?.notify_submissions === 'off'
}

/** "Amira K.", "Amira K. and Ben T.", "Amira K., Ben T. and 3 more". */
export function namesSummary(names: readonly string[], total: number): string {
  const shown = names.slice(0, Math.max(0, total))
  const rest = Math.max(0, total - shown.length)
  if (shown.length === 0) return `${total} student${total === 1 ? '' : 's'}`
  if (rest === 0) {
    return shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
  }
  return `${shown.join(', ')} and ${rest} more`
}

/**
 * The teacher's one-a-day hand-in notification for a set. `names` are
 * displayName()s of the most recent students, `count` everyone who handed in
 * (or improved) today.
 */
export function submissionNotificationCopy(input: {
  title: string
  names: readonly string[]
  count: number
}): { title: string; body: string } {
  const title = oneLine(input.title, 80) || 'a set'
  const count = Math.max(1, Math.floor(input.count))
  if (count === 1) {
    return {
      title: `${input.names[0] ?? 'A student'} handed in ${title}`,
      body: 'Open the set to see the mark.',
    }
  }
  return {
    title: `${count} students handed in ${title} today`,
    body: namesSummary(input.names, count),
  }
}

/**
 * Which of today's rows for one (recipient, type, href) to keep: the newest
 * (created_at, then id, descending). The rest are removed, so a race between
 * two hand-ins in the same instant still ends as one row.
 */
export function collapseDailyRows(
  rows: readonly { id: string; created_at: string | null }[]
): { keep: string | null; remove: string[] } {
  if (rows.length === 0) return { keep: null, remove: [] }
  const sorted = [...rows].sort(
    (a, b) =>
      (Date.parse(b.created_at ?? '') || 0) - (Date.parse(a.created_at ?? '') || 0) ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  )
  return { keep: sorted[0].id, remove: sorted.slice(1).map((r) => r.id) }
}

/** The student's "new set" notification. */
export function publishedNotificationCopy(input: {
  title: string
  teacherName: string
  className: string
  dueAt: string | null
  now: Date
}): { title: string; body: string } {
  const due = formatDueUtc(input.dueAt, input.now)
  return {
    title: `New set: ${oneLine(input.title, 80) || 'from your teacher'}`,
    body: [input.teacherName, oneLine(input.className, 60), due ? `Due ${due}` : null]
      .filter((p): p is string => Boolean(p))
      .join(' · '),
  }
}

export type AttemptCandidate = { id: string; marks_earned: number | null; created_at: string | null }

/**
 * The attempt a hand-in should count: the most marks (a teacher's override
 * included — it has already been written to attempts.marks_earned). A tie
 * keeps the attempt already counted, so a confirm never moves the row; among
 * other ties the earliest wins (the first time that mark was reached).
 */
export function pickBestAttempt<T extends AttemptCandidate>(
  candidates: readonly T[],
  currentId: string | null
): T | null {
  const scored = candidates.filter(
    (c): c is T & { marks_earned: number } => c.marks_earned !== null && Number.isFinite(c.marks_earned)
  )
  if (scored.length === 0) return candidates.find((c) => c.id === currentId) ?? candidates[0] ?? null
  let best = scored[0]
  for (const c of scored.slice(1)) {
    if (c.marks_earned > best.marks_earned) {
      best = c
      continue
    }
    if (c.marks_earned < best.marks_earned || best.id === currentId) continue
    if (c.id === currentId) {
      best = c
      continue
    }
    const ca = Date.parse(c.created_at ?? '')
    const ba = Date.parse(best.created_at ?? '')
    const earlier = Number.isFinite(ca) && (!Number.isFinite(ba) || ca < ba)
    const sameTime = ca === ba || (!Number.isFinite(ca) && !Number.isFinite(ba))
    if (earlier || (sameTime && c.id < best.id)) best = c
  }
  return best
}

/**
 * A hand-in's stored status once its counted attempt's latest decision is
 * known: 'reviewed' after a confirm or an override; otherwise back to what
 * the timestamps say ('late' / 'submitted') — a flag means "look again", so
 * it deliberately leaves the hand-in unreviewed.
 */
export function reviewedSubmissionStatus(input: {
  decision: ReviewDecision | null
  firstSubmittedAt: string
  dueAt: string | null
  extendedDueAt: string | null
}): SubmissionStatus {
  if (input.decision === 'confirm' || input.decision === 'override') return 'reviewed'
  return isLate(input.firstSubmittedAt, input.dueAt, input.extendedDueAt) ? 'late' : 'submitted'
}

/** "Algebra drill", "9709/12 Q3", or null — what a review or note is about. */
export function attemptWorkLabel(input: {
  setTitle?: string | null
  paperCode?: string | null
  questionNumber?: string | null
}): string | null {
  const set = oneLine(input.setTitle, 80)
  if (set) return set
  const paper = oneLine(input.paperCode, 20)
  const q = oneLine(input.questionNumber, 12)
  if (paper && q) return `${paper} Q${q.replace(/^q/i, '')}`
  return paper || null
}

/** The student's `mark_reviewed` notification. */
export function reviewNotificationCopy(input: {
  decision: 'confirm' | 'override'
  teacherName: string
  workLabel: string | null
  marksBefore: number | null
  marksAfter: number | null
  totalMarks: number | null
}): { title: string; body: string } {
  const work = input.workLabel ?? 'your answer'
  if (input.decision === 'override') {
    const change = markChangeText(input.marksBefore, input.marksAfter, input.totalMarks)
    return {
      title: `${input.teacherName} re-marked ${work}`,
      body: change ? `Now ${change}. See every mark.` : 'See every mark as it now stands.',
    }
  }
  const now = markChangeText(null, input.marksAfter, input.totalMarks)
  return {
    title: `${input.teacherName} checked your mark on ${work}`,
    body: now ? `Your ${now} stands.` : 'The mark stands.',
  }
}

/** The student's `teacher_feedback` notification: who, on what, and the start of the note. */
export function feedbackNotificationCopy(input: {
  teacherName: string
  workLabel: string | null
  body: string
}): { title: string; body: string } {
  return {
    title: `${input.teacherName} left feedback on ${input.workLabel ?? 'your answer'}`,
    body: oneLine(input.body, 140),
  }
}

// ---------------------------------------------------------------------------
// Shared I/O
// ---------------------------------------------------------------------------

function logFailure(scope: string, context: Record<string, unknown>, err: unknown): void {
  console.error(`[teacher/notify] ${scope} failed`, {
    ...context,
    error: err instanceof Error ? err.message : String(err),
  })
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * One notification per (recipient, type, href) per UTC day: update today's
 * row if there is one — new text, unread again, moved to the top — or insert
 * it. The push trigger fires on INSERT only, so a class handing in all day is
 * one push, not thirty.
 */
async function upsertDailyNotification(
  admin: SupabaseClient,
  row: { user_id: string; type: string; title: string; body: string; href: string },
  now: Date
): Promise<void> {
  const dayStart = utcDayStart(now).toISOString()
  const today = () =>
    admin
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', row.user_id)
      .eq('type', row.type)
      .eq('href', row.href)
      .gte('created_at', dayStart)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(20)

  const { data: existing, error: findError } = await today()
  if (findError) throw new Error(`notifications: ${findError.message}`)

  if (existing && existing.length > 0) {
    const { keep, remove } = collapseDailyRows(existing as { id: string; created_at: string }[])
    const { error } = await admin
      .from('notifications')
      .update({ title: row.title, body: row.body, read: false, created_at: now.toISOString() })
      .eq('id', keep as string)
      .eq('user_id', row.user_id)
    if (error) throw new Error(`notifications: ${error.message}`)
    if (remove.length > 0) {
      await admin.from('notifications').delete().in('id', remove).eq('user_id', row.user_id)
    }
    return
  }

  const { error: insertError } = await admin.from('notifications').insert(row)
  if (insertError) throw new Error(`notifications: ${insertError.message}`)

  // Two hand-ins in the same instant can both find nothing and both insert.
  // Both then see both rows and keep the same (newest) one.
  const { data: after } = await today()
  const { remove } = collapseDailyRows((after ?? []) as { id: string; created_at: string }[])
  if (remove.length > 0) {
    await admin.from('notifications').delete().in('id', remove).eq('user_id', row.user_id)
  }
}

/**
 * Whether a student-facing review/feedback notification for `href` already
 * exists at or after `since` — i.e. this exact event was already announced.
 */
async function alreadyAnnounced(
  admin: SupabaseClient,
  userId: string,
  type: string,
  href: string,
  since: string
): Promise<boolean> {
  const { count, error } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .eq('href', href)
    .gte('created_at', since)
  if (error) throw new Error(`notifications: ${error.message}`)
  return (count ?? 0) > 0
}

/** True when this student has had another review/feedback notification on `href` within the cooldown. */
async function reviewEmailCoolingDown(admin: SupabaseClient, userId: string, href: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - REVIEW_EMAIL_COOLDOWN_MS).toISOString()
  const { count, error } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['mark_reviewed', 'teacher_feedback'])
    .eq('href', href)
    .gte('created_at', since)
  if (error) return true // cannot tell: stay quiet rather than risk a burst
  // The notification for this event was just written, so one row is expected.
  return (count ?? 0) > 1
}

/** Send the teacher-feedback email to `studentId` after the response, if they may be emailed. */
function queueTeacherFeedbackEmail(
  admin: SupabaseClient,
  studentId: string,
  build: (recipient: { email: string; fullName: string | null; unsubscribeHref: string }) => SendEmailParams
): void {
  runAfterResponse('teacher-feedback-email', async () => {
    const [recipient] = await loadEmailRecipients(admin, [studentId], 'email_assignments')
    if (!recipient) return
    const unsubscribeHref = unsubscribeUrl(studentId, 'assignments')
    deferEmails('teacher-feedback-email', [build({ ...recipient, unsubscribeHref })])
  })
}

// ---------------------------------------------------------------------------
// notifyAssignmentPublished
// ---------------------------------------------------------------------------

type PublishSetRow = Pick<
  Assignment,
  | 'id'
  | 'classroom_id'
  | 'teacher_id'
  | 'title'
  | 'kind'
  | 'target'
  | 'due_at'
  | 'published_at'
  | 'archived_at'
  | 'is_mock'
  | 'instructions'
  | 'settings'
>

type ClassroomNotifyRow = {
  id: string
  name: string
  archived_at: string | null
  settings: ClassroomSettings | null
}

async function loadClassroomForNotify(
  admin: SupabaseClient,
  classroomId: string
): Promise<ClassroomNotifyRow | null> {
  const { data, error } = await admin
    .from('classrooms')
    .select('id, name, archived_at, settings')
    .eq('id', classroomId)
    .maybeSingle()
  if (error) throw new Error(`classrooms: ${error.message}`)
  return (data as ClassroomNotifyRow | null) ?? null
}

/**
 * A set was published (or created with publish: true). Fans out to every
 * targeted active member who is not excused: an `assignment_set`
 * notification linking /dashboard/assignments/[id], and the assignment-set
 * email to those with email_assignments on and no suppression, 50 per
 * after(). A repeat call tells only students not already told, so a retried
 * publish never notifies (or emails) anyone twice.
 */
export async function notifyAssignmentPublished(assignmentId: string): Promise<void> {
  if (!isTeacherV2()) return
  try {
    const admin = createServiceClient()
    const now = new Date()

    const { data: setData, error: setError } = await admin
      .from('assignments')
      .select(
        'id, classroom_id, teacher_id, title, kind, target, due_at, published_at, archived_at, is_mock, instructions, settings'
      )
      .eq('id', assignmentId)
      .maybeSingle()
    if (setError) throw new Error(`assignments: ${setError.message}`)
    const set = setData as PublishSetRow | null
    if (!set || !set.published_at || set.archived_at) return

    const classroom = await loadClassroomForNotify(admin, set.classroom_id)
    if (!classroom || classroom.archived_at) return

    const [members, flags, items] = await Promise.all([
      getClassroomMembers(admin, classroom.id, { status: ['active'] }),
      fetchAllFiltered<{ student_id: string; excused_at: string | null }>('assignment_students', (from, to) =>
        admin
          .from('assignment_students')
          .select('student_id, excused_at')
          .eq('assignment_id', set.id)
          .order('student_id')
          .range(from, to)
      ),
      admin.from('assignment_items').select('id', { count: 'exact', head: true }).eq('assignment_id', set.id),
    ])
    if (items.error) throw new Error(`assignment_items: ${items.error.message}`)

    const targeted = set.target === 'students' ? new Set(flags.rows.map((f) => f.student_id)) : null
    const excused = new Set(flags.rows.filter((f) => f.excused_at).map((f) => f.student_id))
    const recipients = [
      ...new Set(
        members
          .map((m) => m.student_id)
          .filter((id) => (!targeted || targeted.has(id)) && !excused.has(id))
      ),
    ]
    if (recipients.length === 0) return

    const href = studentSetHref(set.id)
    const told = new Set<string>()
    for (const part of chunk(recipients)) {
      const { data, error } = await admin
        .from('notifications')
        .select('user_id')
        .eq('type', 'assignment_set')
        .eq('href', href)
        .in('user_id', part)
      if (error) throw new Error(`notifications: ${error.message}`)
      for (const r of data ?? []) told.add((r as { user_id: string }).user_id)
    }
    const fresh = recipients.filter((id) => !told.has(id))
    if (fresh.length === 0) return

    const teacherRawName = (await loadProfileNames(admin, [set.teacher_id])).get(set.teacher_id) ?? null
    const teacherName = displayName(teacherRawName, 'Your teacher')
    const copy = publishedNotificationCopy({
      title: set.title,
      teacherName,
      className: classroom.name,
      dueAt: set.due_at,
      now,
    })
    for (const part of chunk(fresh, 500)) {
      const { error } = await admin.from('notifications').insert(
        part.map((user_id) => ({
          user_id,
          type: 'assignment_set',
          title: copy.title,
          body: copy.body,
          href,
          actor_id: set.teacher_id,
        }))
      )
      if (error) throw new Error(`notifications: ${error.message}`)
    }

    // Example classes are simulated students; they get the bell, never mail.
    if (classroom.settings?.demo === true) return

    // Consent and addresses are read after the response as well: for a big
    // class that is one account lookup per student, which a teacher waiting
    // on "Publish" should not sit through.
    const itemCount = items.count ?? 0
    runAfterResponse('assignment-set-emails', async () => {
      const mailable = await loadEmailRecipients(admin, fresh, 'email_assignments')
      const emails = mailable.map((r): SendEmailParams => {
        const unsubscribeHref = unsubscribeUrl(r.userId, 'assignments')
        const built = buildAssignmentSetEmail({
          to: r.email,
          recipientName: r.fullName,
          teacherName: teacherRawName,
          className: classroom.name,
          assignmentId: set.id,
          title: set.title,
          kind: set.kind,
          itemCount,
          dueAt: set.due_at,
          isMock: set.is_mock,
          timedMinutes: set.settings?.timed_minutes ?? null,
          instructions: set.instructions,
          unsubscribeHref,
          now,
        })
        return {
          to: r.email,
          subject: built.subject,
          preheader: built.preheader,
          text: built.text,
          html: built.html,
          unsubscribeHref,
        }
      })
      deferEmails('assignment-set-emails', emails)
    })
  } catch (err) {
    logFailure('notifyAssignmentPublished', { assignmentId }, err)
  }
}

// ---------------------------------------------------------------------------
// notifySubmission
// ---------------------------------------------------------------------------

/**
 * A student handed in (or improved) work on a set. Upserts one
 * `submission_received` notification for the teacher per assignment per UTC
 * day, keyed by href, so a class of thirty handing in produces one row, not
 * thirty. Skipped when the classroom's settings.notify_submissions is 'off'.
 */
export async function notifySubmission(input: {
  assignmentId: string
  studentId: string
  attemptId: string
}): Promise<void> {
  if (!isTeacherV2()) return
  try {
    const admin = createServiceClient()
    const now = new Date()

    const { data: setData, error: setError } = await admin
      .from('assignments')
      .select('id, classroom_id, teacher_id, title, published_at, archived_at')
      .eq('id', input.assignmentId)
      .maybeSingle()
    if (setError) throw new Error(`assignments: ${setError.message}`)
    const set = setData as Pick<
      Assignment,
      'id' | 'classroom_id' | 'teacher_id' | 'title' | 'published_at' | 'archived_at'
    > | null
    if (!set || !set.published_at || set.archived_at) return

    const classroom = await loadClassroomForNotify(admin, set.classroom_id)
    if (!classroom || classroom.archived_at || submissionNotificationsOff(classroom.settings)) return

    const dayStart = utcDayStart(now).toISOString()
    const { rows } = await fetchAllFiltered<{ student_id: string; last_submitted_at: string }>(
      'assignment_submissions',
      (from, to) =>
        admin
          .from('assignment_submissions')
          .select('student_id, last_submitted_at')
          .eq('assignment_id', set.id)
          .gte('last_submitted_at', dayStart)
          .order('last_submitted_at', { ascending: false })
          .order('id')
          .range(from, to)
    )
    // Newest first, so the notification names whoever just handed in. The
    // caller's student is counted even if their row is not visible yet.
    const students = [...new Set([input.studentId, ...rows.map((r) => r.student_id)])]
    const named = students.slice(0, 2)
    const names = await loadProfileNames(admin, named)
    const copy = submissionNotificationCopy({
      title: set.title,
      names: named.map((id) => displayName(names.get(id) ?? null)),
      count: students.length,
    })

    await upsertDailyNotification(
      admin,
      {
        user_id: set.teacher_id,
        type: 'submission_received',
        title: copy.title,
        body: copy.body,
        href: teacherSetHref(classroom.id, set.id),
      },
      now
    )
  } catch (err) {
    logFailure('notifySubmission', { assignmentId: input.assignmentId }, err)
  }
}

// ---------------------------------------------------------------------------
// notifyRemind
// ---------------------------------------------------------------------------

/**
 * The teacher pressed Remind. Sends `assignment_due` (notification + email,
 * honouring email_assignments and suppressions) to those of `studentIds` who
 * are active members, targeted, not excused and still missing work — or to
 * all such students when `studentIds` is empty — while the set is open.
 * Stamps assignment_students.reminded_at. Returns how many students were
 * reminded, which the route returns as `{ sent }`. The rules are
 * lib/teacher/reminders.ts's, shared with the daily cron.
 */
export async function notifyRemind(assignmentId: string, studentIds: string[]): Promise<number> {
  if (!isTeacherV2()) return 0
  try {
    const admin = createServiceClient()
    const { reminded } = await remindStudents(admin, assignmentId, {
      mode: 'teacher',
      email: 'defer',
      studentIds,
    })
    return reminded
  } catch (err) {
    logFailure('notifyRemind', { assignmentId }, err)
    return 0
  }
}

// ---------------------------------------------------------------------------
// onOverrideSaved
// ---------------------------------------------------------------------------

type SubmissionRow = {
  id: string
  assignment_id: string
  item_id: string
  student_id: string
  attempt_id: string | null
  marks_earned: number | null
  total_marks: number | null
  status: SubmissionStatus
  first_submitted_at: string
}

type CandidateAttempt = AttemptCandidate & { total_marks: number | null }

const SUBMISSION_COLUMNS =
  'id, assignment_id, item_id, student_id, attempt_id, marks_earned, total_marks, status, first_submitted_at'

/**
 * Recompute every hand-in the reviewed attempt bears on: the rows that count
 * it, and — when it was marked from a set item — that item's row for the
 * student, which it may now beat. Each row gets its best attempt (overrides
 * included), that attempt's marks, and 'reviewed' when that attempt's latest
 * decision is a confirm or an override. Returns the rows as they now stand.
 */
async function syncReviewedSubmissions(
  admin: SupabaseClient,
  attempt: { id: string; user_id: string; assignment_item_id: string | null }
): Promise<SubmissionRow[]> {
  const [byAttempt, byItem] = await Promise.all([
    admin.from('assignment_submissions').select(SUBMISSION_COLUMNS).eq('attempt_id', attempt.id),
    attempt.assignment_item_id
      ? admin
          .from('assignment_submissions')
          .select(SUBMISSION_COLUMNS)
          .eq('item_id', attempt.assignment_item_id)
          .eq('student_id', attempt.user_id)
      : Promise.resolve({ data: [] as SubmissionRow[], error: null }),
  ])
  if (byAttempt.error) throw new Error(`assignment_submissions: ${byAttempt.error.message}`)
  if (byItem.error) throw new Error(`assignment_submissions: ${byItem.error.message}`)
  const rows = new Map<string, SubmissionRow>()
  for (const r of [...(byAttempt.data ?? []), ...(byItem.data ?? [])] as SubmissionRow[]) rows.set(r.id, r)

  const out: SubmissionRow[] = []
  for (const row of rows.values()) {
    const { data: linked, error: linkedError } = await admin
      .from('attempts')
      .select('id, marks_earned, total_marks, created_at')
      .eq('assignment_item_id', row.item_id)
      .eq('user_id', row.student_id)
    if (linkedError) throw new Error(`attempts: ${linkedError.message}`)

    const byId = new Map<string, CandidateAttempt>()
    for (const a of (linked ?? []) as CandidateAttempt[]) byId.set(a.id, a)
    // The attempt already counted may be a reconciled one (not stamped with
    // the item), and so may the reviewed one; both stay in the running.
    const extra = [row.attempt_id, attempt.id].filter(
      (id): id is string => Boolean(id) && !byId.has(id as string)
    )
    const bearsOnRow = row.attempt_id === attempt.id || row.item_id === attempt.assignment_item_id
    const wanted = extra.filter((id) => id !== attempt.id || bearsOnRow)
    if (wanted.length > 0) {
      const { data: more, error } = await admin
        .from('attempts')
        .select('id, marks_earned, total_marks, created_at')
        .in('id', wanted)
      if (error) throw new Error(`attempts: ${error.message}`)
      for (const a of (more ?? []) as CandidateAttempt[]) byId.set(a.id, a)
    }
    const candidates = [...byId.values()].map((a) => ({
      ...a,
      marks_earned: num(a.marks_earned),
      total_marks: num(a.total_marks),
    }))
    const best = pickBestAttempt(candidates, row.attempt_id)
    if (!best) continue

    const [decisions, setRes, flagRes] = await Promise.all([
      admin
        .from('teacher_overrides')
        .select('decision, created_at')
        .eq('attempt_id', best.id)
        .order('created_at', { ascending: false })
        .limit(1),
      admin.from('assignments').select('due_at').eq('id', row.assignment_id).maybeSingle(),
      admin
        .from('assignment_students')
        .select('extended_due_at')
        .eq('assignment_id', row.assignment_id)
        .eq('student_id', row.student_id)
        .maybeSingle(),
    ])
    if (decisions.error) throw new Error(`teacher_overrides: ${decisions.error.message}`)
    const decision = ((decisions.data ?? [])[0] as { decision?: ReviewDecision } | undefined)?.decision ?? null

    const status = reviewedSubmissionStatus({
      decision,
      firstSubmittedAt: row.first_submitted_at,
      dueAt: (setRes.data as { due_at: string | null } | null)?.due_at ?? null,
      extendedDueAt: (flagRes.data as { extended_due_at: string | null } | null)?.extended_due_at ?? null,
    })
    const patch = {
      attempt_id: best.id,
      marks_earned: best.marks_earned,
      total_marks: best.total_marks ?? num(row.total_marks),
      status,
    }
    const changed =
      patch.attempt_id !== row.attempt_id ||
      patch.marks_earned !== num(row.marks_earned) ||
      patch.total_marks !== num(row.total_marks) ||
      patch.status !== row.status
    if (changed) {
      const { error } = await admin.from('assignment_submissions').update(patch).eq('id', row.id)
      if (error) throw new Error(`assignment_submissions: ${error.message}`)
    }
    out.push({ ...row, ...patch })
  }
  return out
}

type DecisionRow = {
  id: string
  teacher_id: string
  decision: ReviewDecision | null
  student_visible: boolean | null
  override_total_earned: number | string | null
  reasoning_note: string | null
  teacher_notes: string | null
  created_at: string
}

type ReviewedAttemptRow = {
  id: string
  user_id: string
  marks_earned: number | string | null
  total_marks: number | string | null
  assignment_item_id: string | null
  original_marks_earned: unknown
  mark_schemes: { paper_code: string | null; question_number: string | null } | Array<{
    paper_code: string | null
    question_number: string | null
  }> | null
}

/** The set a hand-in belongs to, for naming the work; null when there is none. */
async function setTitleFor(admin: SupabaseClient, assignmentId: string | undefined): Promise<string | null> {
  if (!assignmentId) return null
  const { data } = await admin.from('assignments').select('title').eq('id', assignmentId).maybeSingle()
  return (data as { title: string } | null)?.title ?? null
}

function schemeOf(row: ReviewedAttemptRow['mark_schemes']): { paper_code: string | null; question_number: string | null } | null {
  if (!row) return null
  return Array.isArray(row) ? (row[0] ?? null) : row
}

/**
 * A teacher confirmed, overrode or flagged an attempt. Recomputes the
 * attempt's assignment_submissions row (marks_earned from attempts, which an
 * override has already updated, so the overridden mark counts for best-of;
 * status 'reviewed' for confirm/override) and, when the latest decision is
 * student_visible, sends `mark_reviewed` plus the teacher-feedback email.
 * A flag is the teacher's own note-to-self: it is never announced.
 */
export async function onOverrideSaved(attemptId: string): Promise<void> {
  try {
    const admin = createServiceClient()
    const now = new Date()

    const [attemptRes, decisionsRes] = await Promise.all([
      admin
        .from('attempts')
        .select(
          'id, user_id, marks_earned, total_marks, assignment_item_id, original_marks_earned:ai_marking->original_marks_earned, mark_schemes ( paper_code, question_number )'
        )
        .eq('id', attemptId)
        .maybeSingle(),
      admin
        .from('teacher_overrides')
        .select(
          'id, teacher_id, decision, student_visible, override_total_earned, reasoning_note, teacher_notes, created_at'
        )
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(2),
    ])
    if (attemptRes.error) throw new Error(`attempts: ${attemptRes.error.message}`)
    if (decisionsRes.error) throw new Error(`teacher_overrides: ${decisionsRes.error.message}`)
    const attempt = attemptRes.data as ReviewedAttemptRow | null
    const [latest, previous] = (decisionsRes.data ?? []) as DecisionRow[]
    if (!attempt || !latest) return

    const rows = await syncReviewedSubmissions(admin, {
      id: attempt.id,
      user_id: attempt.user_id,
      assignment_item_id: attempt.assignment_item_id,
    })

    const decision = latest.decision ?? 'override'
    if (!isTeacherV2() || decision === 'flag' || latest.student_visible === false) return

    const href = attemptHref(attempt.id)
    if (await alreadyAnnounced(admin, attempt.user_id, 'mark_reviewed', href, latest.created_at)) return

    const [teacherRawName, setTitle] = await Promise.all([
      loadProfileNames(admin, [latest.teacher_id]).then((m) => m.get(latest.teacher_id) ?? null),
      setTitleFor(admin, rows.find((r) => r.attempt_id === attempt.id)?.assignment_id),
    ])
    const teacherName = displayName(teacherRawName, 'Your teacher')
    const scheme = schemeOf(attempt.mark_schemes)
    const workLabel = attemptWorkLabel({
      setTitle,
      paperCode: scheme?.paper_code ?? null,
      questionNumber: scheme?.question_number ?? null,
    })
    const marksAfter = num(attempt.marks_earned)
    const totalMarks = num(attempt.total_marks)
    // Before = what the previous decision left, or the marker's own total
    // (kept in ai_marking on the first override). Never guessed.
    const marksBefore = previous ? num(previous.override_total_earned) : num(attempt.original_marks_earned)

    const copy = reviewNotificationCopy({
      decision,
      teacherName,
      workLabel,
      marksBefore,
      marksAfter,
      totalMarks,
    })
    const { error } = await admin.from('notifications').insert({
      user_id: attempt.user_id,
      type: 'mark_reviewed',
      title: copy.title,
      body: copy.body,
      href,
      actor_id: latest.teacher_id,
    })
    if (error) throw new Error(`notifications: ${error.message}`)

    if (await reviewEmailCoolingDown(admin, attempt.user_id, href, now)) return
    const kind: TeacherFeedbackKind = decision === 'override' ? 'overridden' : 'confirmed'
    queueTeacherFeedbackEmail(admin, attempt.user_id, (r) => {
      const built = buildTeacherFeedbackEmail({
        to: r.email,
        recipientName: r.fullName,
        teacherName: teacherRawName,
        kind,
        attemptId: attempt.id,
        workLabel,
        marksBefore: kind === 'overridden' ? marksBefore : null,
        marksAfter,
        totalMarks,
        note: latest.reasoning_note ?? latest.teacher_notes ?? null,
        unsubscribeHref: r.unsubscribeHref,
      })
      return {
        to: r.email,
        subject: built.subject,
        preheader: built.preheader,
        text: built.text,
        html: built.html,
        unsubscribeHref: r.unsubscribeHref,
      }
    })
  } catch (err) {
    logFailure('onOverrideSaved', { attemptId }, err)
  }
}

// ---------------------------------------------------------------------------
// onFeedbackSaved
// ---------------------------------------------------------------------------

type FeedbackRow = {
  id: string
  attempt_id: string
  student_id: string
  teacher_id: string
  body: string
  created_at: string
}

/**
 * A teacher wrote feedback on an attempt. Sends the student a
 * `teacher_feedback` notification linking the attempt, plus the
 * teacher-feedback email when their preferences allow. A deleted note (the
 * route also calls this after DELETE) has nothing to announce.
 */
export async function onFeedbackSaved(feedbackId: string): Promise<void> {
  if (!isTeacherV2()) return
  try {
    const admin = createServiceClient()
    const now = new Date()

    const { data, error } = await admin
      .from('teacher_feedback')
      .select('id, attempt_id, student_id, teacher_id, body, created_at')
      .eq('id', feedbackId)
      .maybeSingle()
    if (error) throw new Error(`teacher_feedback: ${error.message}`)
    const feedback = data as FeedbackRow | null
    if (!feedback || !feedback.body?.trim()) return

    const href = attemptHref(feedback.attempt_id)
    if (await alreadyAnnounced(admin, feedback.student_id, 'teacher_feedback', href, feedback.created_at)) return

    const [attemptRes, submissionRes, teacherRawName] = await Promise.all([
      admin
        .from('attempts')
        .select('id, mark_schemes ( paper_code, question_number )')
        .eq('id', feedback.attempt_id)
        .maybeSingle(),
      admin
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('attempt_id', feedback.attempt_id)
        .limit(1),
      loadProfileNames(admin, [feedback.teacher_id]).then((m) => m.get(feedback.teacher_id) ?? null),
    ])
    const scheme = schemeOf(
      ((attemptRes.data as { mark_schemes?: ReviewedAttemptRow['mark_schemes'] } | null)?.mark_schemes ??
        null) as ReviewedAttemptRow['mark_schemes']
    )
    const setTitle = await setTitleFor(
      admin,
      ((submissionRes.data ?? [])[0] as { assignment_id?: string } | undefined)?.assignment_id
    )
    const workLabel = attemptWorkLabel({
      setTitle,
      paperCode: scheme?.paper_code ?? null,
      questionNumber: scheme?.question_number ?? null,
    })
    const teacherName = displayName(teacherRawName, 'Your teacher')
    const copy = feedbackNotificationCopy({ teacherName, workLabel, body: feedback.body })

    const { error: insertError } = await admin.from('notifications').insert({
      user_id: feedback.student_id,
      type: 'teacher_feedback',
      title: copy.title,
      body: copy.body,
      href,
      actor_id: feedback.teacher_id,
    })
    if (insertError) throw new Error(`notifications: ${insertError.message}`)

    if (await reviewEmailCoolingDown(admin, feedback.student_id, href, now)) return
    queueTeacherFeedbackEmail(admin, feedback.student_id, (r) => {
      const built = buildTeacherFeedbackEmail({
        to: r.email,
        recipientName: r.fullName,
        teacherName: teacherRawName,
        kind: 'feedback',
        attemptId: feedback.attempt_id,
        workLabel,
        marksBefore: null,
        marksAfter: null,
        totalMarks: null,
        note: feedback.body,
        unsubscribeHref: r.unsubscribeHref,
      })
      return {
        to: r.email,
        subject: built.subject,
        preheader: built.preheader,
        text: built.text,
        html: built.html,
        unsubscribeHref: r.unsubscribeHref,
      }
    })
  } catch (err) {
    logFailure('onFeedbackSaved', { feedbackId }, err)
  }
}

// ---------------------------------------------------------------------------
// auditLog
// ---------------------------------------------------------------------------

/**
 * Append a row to teacher_audit_log (service role; the table has no client
 * grants). Written for every action in §8: viewing a student, exporting,
 * overriding, feedback, removing a student, regenerating the invite code,
 * archiving or deleting a class. Included in the student's privacy export.
 *
 * Best-effort like everything here: an audit write that fails is logged
 * loudly but does not fail the teacher's request.
 */
export async function auditLog(entry: TeacherAuditEntry): Promise<void> {
  try {
    const admin = createServiceClient()
    const { error } = await admin.from('teacher_audit_log').insert({
      actor_id: entry.actorId,
      classroom_id: entry.classroomId ?? null,
      student_id: entry.studentId ?? null,
      action: entry.action,
      meta: entry.meta ?? null,
    })
    if (error) {
      console.error('[teacher/audit] insert failed', { action: entry.action, error: error.message })
    }
  } catch (err) {
    console.error('[teacher/audit] insert failed', {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
