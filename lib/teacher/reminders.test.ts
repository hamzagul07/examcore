import assert from 'node:assert/strict'
import {
  REMINDER_GRACE_MS,
  REMINDER_LOOKAHEAD_MS,
  REMINDER_REPEAT_MS,
  reminderNotification,
  reminderSetIds,
  reminderWindow,
  selectReminderRecipients,
  type ReminderSet,
} from '@/lib/teacher/reminders'
import type { AssignmentItem, AssignmentStudentFlags, AssignmentSubmission } from '@/lib/teacher/types'
import type { ClassroomMember } from '@/lib/teacher-analytics'

const HOUR = 3_600_000
const NOW = new Date('2026-09-25T16:00:00Z')
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR).toISOString()

const item = (id: string, position: number): AssignmentItem => ({
  id,
  assignment_id: 'set',
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: `ms-${id}`,
  paper_code: '9709/12',
  paper_session: 'm/j/24',
  question_number: String(position + 1),
  total_marks: 5,
  syllabus_tags: null,
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
})

const flags = (student_id: string, over: Partial<AssignmentStudentFlags> = {}): AssignmentStudentFlags => ({
  assignment_id: 'set',
  student_id,
  excused_at: null,
  extended_due_at: null,
  feedback: null,
  feedback_at: null,
  reminded_at: null,
  ...over,
})

const handIn = (student_id: string, item_id: string): AssignmentSubmission => ({
  id: `${student_id}-${item_id}`,
  assignment_id: 'set',
  item_id,
  student_id,
  attempt_id: `att-${student_id}-${item_id}`,
  attempt_count: 1,
  marks_earned: 4,
  total_marks: 5,
  status: 'submitted',
  source: 'linked',
  first_submitted_at: at(-2),
  last_submitted_at: at(-2),
})

const member = (student_id: string, status: ClassroomMember['status'] = 'active'): ClassroomMember => ({
  student_id,
  status,
  joined_at: '2026-09-01T09:00:00Z',
})

const ITEMS = [item('i1', 0), item('i2', 1)]

function set(over: Partial<ReminderSet> = {}): ReminderSet {
  return {
    target: 'all',
    due_at: at(20),
    published_at: '2026-09-20T09:00:00Z',
    closed_at: null,
    archived_at: null,
    items: ITEMS,
    flags: [],
    submissions: [],
    ...over,
  }
}

const ids = (xs: { student_id: string }[]) => xs.map((x) => x.student_id)

// --- the window ------------------------------------------------------------------

{
  const w = reminderWindow(NOW)
  assert.equal(w.from, NOW.toISOString())
  assert.equal(Date.parse(w.to) - NOW.getTime(), REMINDER_LOOKAHEAD_MS + REMINDER_GRACE_MS)
  // Consecutive daily runs overlap by the grace period, so a run that starts a
  // few minutes late cannot let a deadline fall between two windows.
  const tomorrow = reminderWindow(new Date(NOW.getTime() + 24 * HOUR + 5 * 60_000))
  assert.ok(Date.parse(tomorrow.from) < Date.parse(w.to), 'windows overlap')
  // …and the overlap cannot remind anyone twice: the repeat guard outlasts it.
  assert.ok(REMINDER_REPEAT_MS > REMINDER_GRACE_MS && REMINDER_REPEAT_MS < 24 * HOUR)
}

// --- the 24-hour rule --------------------------------------------------------------

{
  const members = [member('amira'), member('ben')]
  assert.deepEqual(
    ids(selectReminderRecipients({ set: set({ due_at: at(20) }), members, now: NOW, mode: 'due_soon' })),
    ['amira', 'ben'],
    'due in 20 hours, nothing handed in: both reminded'
  )
  assert.deepEqual(
    selectReminderRecipients({ set: set({ due_at: at(30) }), members, now: NOW, mode: 'due_soon' }),
    [],
    'due in 30 hours: not yet'
  )
  assert.deepEqual(
    ids(selectReminderRecipients({ set: set({ due_at: at(24.5) }), members, now: NOW, mode: 'due_soon' })),
    ['amira', 'ben'],
    'just past 24 h is inside the grace overlap'
  )
  assert.deepEqual(
    selectReminderRecipients({ set: set({ due_at: at(-1) }), members, now: NOW, mode: 'due_soon' }),
    [],
    'already due: the cron does not remind (the teacher can)'
  )
  assert.deepEqual(
    selectReminderRecipients({ set: set({ due_at: null }), members, now: NOW, mode: 'due_soon' }),
    [],
    'no deadline, nothing is ever "due soon"'
  )
}

// --- excused, extended, done, left -------------------------------------------------

{
  const members = [member('amira'), member('ben'), member('chen'), member('dev'), member('eli', 'left')]
  const s = set({
    due_at: at(20),
    flags: [
      flags('ben', { excused_at: at(-48) }),
      flags('chen', { extended_due_at: at(72) }),
    ],
    submissions: [handIn('dev', 'i1'), handIn('dev', 'i2'), handIn('amira', 'i1')],
  })
  const picked = selectReminderRecipients({ set: s, members, now: NOW, mode: 'due_soon' })
  assert.deepEqual(ids(picked), ['amira'], 'excused (ben), extended (chen), finished (dev) and departed (eli) are skipped')
  assert.equal(picked[0].items_left, 1, 'part-way: one of two still to hand in')
  assert.equal(picked[0].items_total, 2)
  assert.equal(picked[0].deadline, new Date(at(20)).toISOString())

  // The extended student is reminded before THEIR deadline instead.
  const later = new Date(NOW.getTime() + 60 * HOUR)
  const s2 = set({ ...s, due_at: at(20), flags: [flags('chen', { extended_due_at: at(72) })] })
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s2, members: [member('chen')], now: later, mode: 'due_soon' })),
    ['chen'],
    'an extension moves the reminder, it does not cancel it'
  )

  // An extension can only extend: a typo'd earlier date never pulls a reminder forward.
  const s3 = set({ due_at: at(40), flags: [flags('amira', { extended_due_at: at(10) })] })
  assert.deepEqual(selectReminderRecipients({ set: s3, members: [member('amira')], now: NOW, mode: 'due_soon' }), [])
}

// --- reminded recently -------------------------------------------------------------

{
  const members = [member('amira'), member('ben')]
  const s = set({
    flags: [
      flags('amira', { reminded_at: at(-3) }),
      flags('ben', { reminded_at: new Date(NOW.getTime() - REMINDER_REPEAT_MS - HOUR).toISOString() }),
    ],
  })
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s, members, now: NOW, mode: 'due_soon' })),
    ['ben'],
    'the teacher (or the last run) reminded amira three hours ago: the cron leaves her alone'
  )
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s, members, now: NOW, mode: 'teacher' })),
    ['amira', 'ben'],
    'the teacher Remind button is not held back by the cron guard (the route throttles it)'
  )
}

// --- targeting and set state ---------------------------------------------------------

{
  const members = [member('amira'), member('ben')]
  const targeted = set({ target: 'students', flags: [flags('ben')] })
  assert.deepEqual(ids(selectReminderRecipients({ set: targeted, members, now: NOW, mode: 'due_soon' })), ['ben'])

  assert.deepEqual(selectReminderRecipients({ set: set({ published_at: null }), members, now: NOW, mode: 'teacher' }), [], 'draft')
  assert.deepEqual(selectReminderRecipients({ set: set({ archived_at: at(-1) }), members, now: NOW, mode: 'teacher' }), [], 'archived')
  assert.deepEqual(selectReminderRecipients({ set: set({ closed_at: at(-1) }), members, now: NOW, mode: 'teacher' }), [], 'closed')
  assert.deepEqual(selectReminderRecipients({ set: set({ items: [] }), members, now: NOW, mode: 'teacher' }), [], 'nothing to hand in')

  // Closed for the class, but a student's extension runs past the close: they alone are still reminded.
  const closedButExtended = set({ closed_at: at(-1), flags: [flags('ben', { extended_due_at: at(22) })] })
  assert.deepEqual(
    ids(selectReminderRecipients({ set: closedButExtended, members, now: NOW, mode: 'due_soon' })),
    ['ben'],
    'the cron reminds the extended student before their own deadline'
  )
  assert.deepEqual(
    ids(selectReminderRecipients({ set: closedButExtended, members, now: NOW, mode: 'teacher' })),
    ['ben'],
    'and the teacher can still chase them'
  )
  // Auto-closed a week after the due date; an extension falling due tomorrow is still reminded.
  const autoClosed = set({ due_at: at(-8 * 24), flags: [flags('amira', { extended_due_at: at(20) })] })
  assert.deepEqual(ids(selectReminderRecipients({ set: autoClosed, members, now: NOW, mode: 'due_soon' })), ['amira'])
}

// --- the teacher's pick ------------------------------------------------------------

{
  const members = [member('amira'), member('ben'), member('chen')]
  const s = set({ due_at: at(-30), submissions: [handIn('chen', 'i1'), handIn('chen', 'i2')] })
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s, members, now: NOW, mode: 'teacher' })),
    ['amira', 'ben'],
    'overdue and in grace: the teacher can chase everyone who still owes work'
  )
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s, members, now: NOW, mode: 'teacher', only: new Set(['ben', 'chen', 'stranger']) })),
    ['ben'],
    'a picked student who finished, or is not in the class, is not reminded'
  )
  assert.deepEqual(
    ids(selectReminderRecipients({ set: s, members, now: NOW, mode: 'teacher', only: new Set() })),
    ['amira', 'ben'],
    'an empty pick means everyone'
  )
}

// --- copy --------------------------------------------------------------------------

{
  const soon = reminderNotification({
    title: 'Vectors',
    kind: 'question_set',
    deadline: at(5),
    itemsLeft: 2,
    itemsTotal: 3,
    mode: 'due_soon',
    now: NOW,
  })
  assert.equal(soon.title, 'Due in 5 hours: Vectors')
  assert.equal(soon.body, 'Due Fri 25 Sep, 21:00 UTC · 2 of 3 questions left')

  const chased = reminderNotification({
    title: 'Paper 1',
    kind: 'whole_paper',
    deadline: at(-26),
    itemsLeft: 1,
    itemsTotal: 1,
    mode: 'teacher',
    now: NOW,
  })
  assert.equal(chased.title, 'Reminder from your teacher: Paper 1')
  assert.equal(chased.body, 'Was due Thu 24 Sep, 14:00 UTC · Not handed in yet')
}

assert.deepEqual(reminderSetIds([{ id: 'b' }, { id: 'a' }], [{ assignment_id: 'b' }, { assignment_id: 'c' }]), ['a', 'b', 'c'])

console.log('reminders.test.ts — all assertions passed')
