import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { buildAssignmentDueEmail, relativeDue } from '@/lib/email/assignment-due'
import { formatDueUtc, itemNoun, oneLine } from '@/lib/email/assignment-set'
import type { SendEmailParams } from '@/lib/email/send'
import { createServiceClient } from '@/lib/supabase/service'
import {
  deriveStudentState,
  effectiveDueAt,
  HANDED_IN_STATES,
  studentAssignmentStatus,
} from '@/lib/teacher/assignment-status'
import {
  deferEmails,
  loadEmailRecipients,
  loadProfileNames,
  sendEmailsNow,
} from '@/lib/teacher/email/recipients'
import type {
  Assignment,
  AssignmentItem,
  AssignmentKind,
  AssignmentStudentFlags,
  AssignmentSubmission,
  ClassroomSettings,
} from '@/lib/teacher/types'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import {
  chunk,
  fetchAllFiltered,
  getClassroomMembers,
  hydrateSets,
  type SetRow,
} from '@/lib/teacher-classroom-data'

/**
 * "This is due soon" and "your teacher is chasing this" (docs/TEACHER_SYSTEM_SPEC.md §5).
 *
 * Two ways in, one set of rules:
 *
 *   - The assignment-reminders cron (/api/cron/assignment-reminders, daily at
 *     16:00 UTC) reminds each student whose OWN deadline — the later of the
 *     set's due date and their extension — falls in the next 24 hours and
 *     who still has work missing. Excused students are never reminded; a
 *     student whose extension moves their deadline out of the window is not
 *     reminded yet (and is, the day before the extended deadline).
 *   - The teacher's Remind button (notifyRemind in lib/teacher/notify.ts):
 *     the same students, without the time window.
 *
 * Each reminder is an in-app `assignment_due` notification (always — the
 * student asked to be in the class) and, for students with
 * `email_assignments` on and a deliverable address, the assignment-due
 * email. The cron's email is a dry run unless ASSIGNMENT_REMINDER_SEND=true;
 * its in-app reminders are not, following the other daily nudges.
 *
 * `assignment_students.reminded_at` records the last reminder. The cron
 * claims it with a conditional update before notifying, so two overlapping
 * runs (or a run right after the teacher pressed Remind) cannot remind the
 * same student twice.
 */

const HOUR_MS = 3_600_000

/** How far ahead of a deadline the cron reminds. */
export const REMINDER_LOOKAHEAD_MS = 24 * HOUR_MS
/**
 * Extra reach past the lookahead. The cron is daily; if one run starts a few
 * minutes late, a deadline just past the previous run's window would fall
 * between the two. The overlap closes that gap and the repeat guard below
 * keeps the overlap from reminding anyone twice.
 */
export const REMINDER_GRACE_MS = HOUR_MS
/** A student reminded (by the cron or the teacher) this recently is not reminded again by the cron. */
export const REMINDER_REPEAT_MS = 20 * HOUR_MS
/** Stop starting new sets after this long, well inside the 300 s function limit. */
export const REMINDER_TIME_BUDGET_MS = 240_000
/** Sets reminded at once by the cron. */
const REMINDER_CONCURRENCY = 4

export type ReminderMode = 'due_soon' | 'teacher'

/** The deadlines the cron covers at `now`: (from, to]. */
export function reminderWindow(now: Date): { from: string; to: string } {
  return {
    from: now.toISOString(),
    to: new Date(now.getTime() + REMINDER_LOOKAHEAD_MS + REMINDER_GRACE_MS).toISOString(),
  }
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export type ReminderSet = Pick<
  Assignment,
  'target' | 'due_at' | 'published_at' | 'closed_at' | 'archived_at'
> & {
  items: AssignmentItem[]
  flags: AssignmentStudentFlags[]
  submissions: AssignmentSubmission[]
}

export type ReminderCandidate = {
  student_id: string
  /** The deadline this student is held to, or null when the set has none. */
  deadline: string | null
  items_left: number
  items_total: number
}

/**
 * Pure: who should be reminded about one set at `now`.
 *
 * Common rules: the set is published, not archived and still open for the
 * student (studentAssignmentStatus — a closed set is finished, except for a
 * student whose extension runs past its close); the student is an active
 * member it is for (every member for target 'all', those with a row for
 * target 'students'), not excused, and has at least one item not handed in.
 *
 * `due_soon` adds: their deadline is inside reminderWindow(now), and they
 * have not been reminded in the last REMINDER_REPEAT_MS.
 * `teacher` adds: only the students in `only`, when it is non-empty.
 */
export function selectReminderRecipients(input: {
  set: ReminderSet
  members: readonly ClassroomMember[]
  now: Date
  mode: ReminderMode
  only?: ReadonlySet<string> | null
}): ReminderCandidate[] {
  const { set, members, now, mode } = input
  if (!set.published_at || set.archived_at) return []
  if (set.items.length === 0) return []

  const nowMs = now.getTime()
  const window = reminderWindow(now)
  const windowTo = Date.parse(window.to)
  const flagsByStudent = new Map(set.flags.map((f) => [f.student_id, f]))
  const targeted = set.target === 'students' ? new Set(set.flags.map((f) => f.student_id)) : null

  const out: ReminderCandidate[] = []
  const seen = new Set<string>()
  for (const m of members) {
    if (m.status !== 'active' || seen.has(m.student_id)) continue
    seen.add(m.student_id)
    if (targeted && !targeted.has(m.student_id)) continue
    if (mode === 'teacher' && input.only && input.only.size > 0 && !input.only.has(m.student_id)) continue

    const flags = flagsByStudent.get(m.student_id) ?? null
    if (flags?.excused_at) continue
    if (studentAssignmentStatus(set, flags?.extended_due_at ?? null, now) !== 'open') continue

    const deadline = effectiveDueAt(set.due_at, flags?.extended_due_at ?? null)
    if (mode === 'due_soon') {
      const d = toMs(deadline)
      if (d === null || d <= nowMs || d > windowTo) continue
      const reminded = toMs(flags?.reminded_at ?? null)
      if (reminded !== null && nowMs - reminded < REMINDER_REPEAT_MS) continue
    }

    const state = deriveStudentState({
      membership: m.status,
      items: set.items,
      submissions: set.submissions.filter((s) => s.student_id === m.student_id),
      flags,
      due_at: set.due_at,
    })
    const left = state.items.filter((i) => !HANDED_IN_STATES.has(i.state)).length
    if (left === 0) continue
    out.push({ student_id: m.student_id, deadline, items_left: left, items_total: set.items.length })
  }
  return out.sort((a, b) => a.student_id.localeCompare(b.student_id))
}

/** The in-app notification for one reminder. Plain text; the bell renders it as text. */
export function reminderNotification(input: {
  title: string
  kind: AssignmentKind
  deadline: string | null
  itemsLeft: number
  itemsTotal: number
  mode: ReminderMode
  now: Date
}): { title: string; body: string } {
  const title = oneLine(input.title, 80) || 'your set'
  const relative = relativeDue(input.deadline, input.now)
  const due = formatDueUtc(input.deadline, input.now)
  const left =
    input.itemsTotal <= 1
      ? 'Not handed in yet'
      : `${input.itemsLeft} of ${input.itemsTotal} ${itemNoun(input.kind, input.itemsTotal)} left`
  const heading =
    input.mode === 'teacher'
      ? `Reminder from your teacher: ${title}`
      : relative === 'now overdue'
        ? `Overdue: ${title}`
        : `Due ${relative ?? 'soon'}: ${title}`
  const when = due ? (relative === 'now overdue' ? `Was due ${due}` : `Due ${due}`) : null
  return { title: heading, body: [when, left].filter(Boolean).join(' · ') }
}

type ReminderSetRow = SetRow & {
  teacher_id: string
  settings: Assignment['settings'] | null
}

type ReminderClassroomRow = {
  id: string
  name: string
  teacher_id: string
  archived_at: string | null
  settings: ClassroomSettings | null
}

export type RemindResult = { reminded: number; emailed: number }

/**
 * Stamp reminded_at for the candidates and return the students actually
 * claimed. `due_soon` claims conditionally (only rows not reminded within
 * REMINDER_REPEAT_MS, and only new rows for students without one), so a
 * concurrent run cannot claim the same student; `teacher` stamps everyone
 * the teacher asked for.
 */
async function claimReminders(
  admin: SupabaseClient,
  assignmentId: string,
  studentIds: readonly string[],
  existing: ReadonlySet<string>,
  now: Date,
  mode: ReminderMode
): Promise<string[]> {
  const nowIso = now.toISOString()
  if (mode === 'teacher') {
    const { error } = await admin.from('assignment_students').upsert(
      studentIds.map((student_id) => ({ assignment_id: assignmentId, student_id, reminded_at: nowIso })),
      { onConflict: 'assignment_id,student_id' }
    )
    if (error) throw new Error(`assignment_students: ${error.message}`)
    return [...studentIds]
  }

  const cutoff = new Date(now.getTime() - REMINDER_REPEAT_MS).toISOString()
  const claimed: string[] = []
  const withRow = studentIds.filter((id) => existing.has(id))
  const withoutRow = studentIds.filter((id) => !existing.has(id))
  for (const part of chunk(withRow)) {
    const { data, error } = await admin
      .from('assignment_students')
      .update({ reminded_at: nowIso })
      .eq('assignment_id', assignmentId)
      .in('student_id', part)
      .or(`reminded_at.is.null,reminded_at.lt."${cutoff}"`)
      .select('student_id')
    if (error) throw new Error(`assignment_students: ${error.message}`)
    for (const r of data ?? []) claimed.push((r as { student_id: string }).student_id)
  }
  if (withoutRow.length > 0) {
    // A target-'all' set has no row for most students. Insert one carrying
    // only reminded_at; a row that appeared meanwhile is left alone (and that
    // student is not claimed by this run).
    const { data, error } = await admin
      .from('assignment_students')
      .upsert(
        withoutRow.map((student_id) => ({ assignment_id: assignmentId, student_id, reminded_at: nowIso })),
        { onConflict: 'assignment_id,student_id', ignoreDuplicates: true }
      )
      .select('student_id')
    if (error) throw new Error(`assignment_students: ${error.message}`)
    for (const r of data ?? []) claimed.push((r as { student_id: string }).student_id)
  }
  return claimed
}

/**
 * Remind the students of one set (see the module rules). Returns how many
 * were reminded and how many emails were sent (or, for `defer`, queued).
 *
 * `email`: 'defer' sends after the response, 50 per after() (request-time
 * callers); 'await' sends now (the cron); 'off' records the in-app reminder
 * only and logs what would have been emailed (the cron's dry run).
 */
export async function remindStudents(
  admin: SupabaseClient,
  assignmentId: string,
  opts: {
    mode: ReminderMode
    email: 'defer' | 'await' | 'off'
    studentIds?: readonly string[]
    now?: Date
  }
): Promise<RemindResult> {
  const now = opts.now ?? new Date()

  const { data: setRow, error: setError } = await admin
    .from('assignments')
    .select(
      'id, classroom_id, teacher_id, title, kind, subject_code, is_mock, target, due_at, published_at, closed_at, archived_at, created_at, settings'
    )
    .eq('id', assignmentId)
    .maybeSingle()
  if (setError) throw new Error(`assignments: ${setError.message}`)
  const set = setRow as ReminderSetRow | null
  if (!set || !set.published_at || set.archived_at) return { reminded: 0, emailed: 0 }

  const { data: classroomRow, error: classroomError } = await admin
    .from('classrooms')
    .select('id, name, teacher_id, archived_at, settings')
    .eq('id', set.classroom_id)
    .maybeSingle()
  if (classroomError) throw new Error(`classrooms: ${classroomError.message}`)
  const classroom = classroomRow as ReminderClassroomRow | null
  if (!classroom || classroom.archived_at) return { reminded: 0, emailed: 0 }

  const [[hydrated], members] = await Promise.all([
    hydrateSets(admin, [set]),
    getClassroomMembers(admin, classroom.id),
  ])
  if (!hydrated) return { reminded: 0, emailed: 0 }

  const only = opts.studentIds && opts.studentIds.length > 0 ? new Set(opts.studentIds) : null
  const candidates = selectReminderRecipients({ set: hydrated, members, now, mode: opts.mode, only })
  if (candidates.length === 0) return { reminded: 0, emailed: 0 }

  const existing = new Set(hydrated.flags.map((f) => f.student_id))
  const claimed = new Set(
    await claimReminders(
      admin,
      set.id,
      candidates.map((c) => c.student_id),
      existing,
      now,
      opts.mode
    )
  )
  const reminded = candidates.filter((c) => claimed.has(c.student_id))
  if (reminded.length === 0) return { reminded: 0, emailed: 0 }

  const href = `/dashboard/assignments/${set.id}`
  const rows = reminded.map((c) => {
    const copy = reminderNotification({
      title: set.title,
      kind: set.kind,
      deadline: c.deadline,
      itemsLeft: c.items_left,
      itemsTotal: c.items_total,
      mode: opts.mode,
      now,
    })
    return {
      user_id: c.student_id,
      type: 'assignment_due',
      title: copy.title,
      body: copy.body,
      href,
      // The teacher's Remind is theirs; the cron's is a system notice.
      actor_id: opts.mode === 'teacher' ? set.teacher_id : null,
    }
  })
  for (const part of chunk(rows, 500)) {
    const { error } = await admin.from('notifications').insert(part)
    if (error) console.error('[teacher/reminders] notification insert failed', { assignmentId, error: error.message })
  }

  // Example classes are simulated students; they get the bell, never mail.
  if (classroom.settings?.demo === true) return { reminded: reminded.length, emailed: 0 }

  const recipients = await loadEmailRecipients(
    admin,
    reminded.map((c) => c.student_id),
    'email_assignments'
  )
  if (recipients.length === 0) return { reminded: reminded.length, emailed: 0 }

  if (opts.email === 'off') {
    console.log('[teacher/reminders] dry-run — would email', {
      assignmentId,
      recipients: recipients.length,
    })
    return { reminded: reminded.length, emailed: 0 }
  }

  const teacherName = (await loadProfileNames(admin, [set.teacher_id])).get(set.teacher_id) ?? null
  const byStudent = new Map(reminded.map((c) => [c.student_id, c]))
  const emails: SendEmailParams[] = []
  for (const r of recipients) {
    const c = byStudent.get(r.userId)
    if (!c) continue
    const unsubscribeHref = unsubscribeUrl(r.userId, 'assignments')
    const built = buildAssignmentDueEmail({
      to: r.email,
      recipientName: r.fullName,
      teacherName,
      className: classroom.name,
      assignmentId: set.id,
      title: set.title,
      kind: set.kind,
      deadline: c.deadline,
      itemsLeft: c.items_left,
      itemsTotal: c.items_total,
      reason: opts.mode,
      unsubscribeHref,
      now,
    })
    emails.push({
      to: r.email,
      subject: built.subject,
      preheader: built.preheader,
      text: built.text,
      html: built.html,
      unsubscribeHref,
    })
  }

  if (opts.email === 'defer') {
    deferEmails('assignment-due-emails', emails)
    return { reminded: reminded.length, emailed: emails.length }
  }
  return { reminded: reminded.length, emailed: await sendEmailsNow(emails) }
}

// ---------------------------------------------------------------------------
// The cron run
// ---------------------------------------------------------------------------

export type AssignmentRemindersRunResult = {
  dryRun: boolean
  /** Sets with a deadline (theirs or a student's extension) in the window. */
  sets: number
  reminded: number
  emailed: number
  failed: number
  /** Sets not reached inside the time budget. */
  deferred: number
}

/** Real emails only when ASSIGNMENT_REMINDER_SEND=true; anything else is a dry run. */
export function assignmentReminderSendEnabled(): boolean {
  return process.env.ASSIGNMENT_REMINDER_SEND?.trim() === 'true'
}

/** Pure: the sets to look at — due in the window, or with an extension in it. */
export function reminderSetIds(
  dueInWindow: readonly { id: string }[],
  extensionsInWindow: readonly { assignment_id: string }[]
): string[] {
  return [...new Set([...dueInWindow.map((s) => s.id), ...extensionsInWindow.map((e) => e.assignment_id)])].sort()
}

export async function runAssignmentReminders(
  opts: { now?: Date; send?: boolean; budgetMs?: number } = {}
): Promise<AssignmentRemindersRunResult> {
  const admin = createServiceClient()
  const now = opts.now ?? new Date()
  const send = opts.send ?? assignmentReminderSendEnabled()
  const budget = opts.budgetMs ?? REMINDER_TIME_BUDGET_MS
  const started = Date.now()
  const window = reminderWindow(now)

  const [due, extended] = await Promise.all([
    fetchAllFiltered<{ id: string }>('assignments', (from, to) =>
      admin
        .from('assignments')
        .select('id')
        .not('published_at', 'is', null)
        .is('archived_at', null)
        .gt('due_at', window.from)
        .lte('due_at', window.to)
        .order('id')
        .range(from, to)
    ),
    fetchAllFiltered<{ assignment_id: string }>('assignment_students', (from, to) =>
      admin
        .from('assignment_students')
        .select('assignment_id')
        .is('excused_at', null)
        .gt('extended_due_at', window.from)
        .lte('extended_due_at', window.to)
        .order('assignment_id')
        .order('student_id')
        .range(from, to)
    ),
  ])

  const ids = reminderSetIds(due.rows, extended.rows)
  const result: AssignmentRemindersRunResult = {
    dryRun: !send,
    sets: ids.length,
    reminded: 0,
    emailed: 0,
    failed: 0,
    deferred: 0,
  }

  // A small pool; no new set is started once the budget is spent, so
  // everything already started finishes inside the function's 300 s.
  let next = 0
  const lane = async () => {
    while (next < ids.length) {
      const id = ids[next++]
      if (Date.now() - started > budget) {
        result.deferred += 1
        continue
      }
      try {
        const r = await remindStudents(admin, id, { mode: 'due_soon', email: send ? 'await' : 'off', now })
        result.reminded += r.reminded
        result.emailed += r.emailed
      } catch (err) {
        result.failed += 1
        console.error('[assignment-reminders] set failed', {
          assignmentId: id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(REMINDER_CONCURRENCY, Math.max(1, ids.length)) }, lane))

  if (result.deferred > 0) {
    console.warn(`[assignment-reminders] time budget reached; ${result.deferred} set(s) deferred`)
  }
  return result
}
