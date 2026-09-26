import assert from 'node:assert/strict'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import type { ClassSet } from '@/lib/teacher-classroom-data'
import type { AssignmentItem, AssignmentStudentFlags, AssignmentSubmission } from '@/lib/teacher/types'
import {
  buildTeacherOverview,
  isSilentClass,
  overdueStudentIds,
  type OverviewClassInput,
} from '@/lib/teacher/overview'

const NOW = new Date('2026-09-25T12:00:00.000Z') // Friday, ISO week 2026-W39 (Mon 21 – Sun 27)
const DAY = 86_400_000
const iso = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString()

const member = (
  student_id: string,
  joined: number,
  status: ClassroomMember['status'] = 'active'
): ClassroomMember => ({ student_id, status, joined_at: iso(joined), left_at: null, removed_at: null })

function item(id: string, setId: string, position = 0): AssignmentItem {
  return {
    id,
    assignment_id: setId,
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: `ms-${id}`,
    paper_code: '9709/12',
    paper_session: 'm24',
    question_number: String(position + 1),
    total_marks: 8,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
  }
}

const sub = (setId: string, itemId: string, student: string, at: number): AssignmentSubmission => ({
  id: `s-${itemId}-${student}`,
  assignment_id: setId,
  item_id: itemId,
  student_id: student,
  attempt_id: `a-${itemId}-${student}`,
  attempt_count: 1,
  marks_earned: 5,
  total_marks: 8,
  status: 'submitted',
  source: 'linked',
  first_submitted_at: iso(at),
  last_submitted_at: iso(at),
})

const flag = (setId: string, student: string, over: Partial<AssignmentStudentFlags>): AssignmentStudentFlags => ({
  assignment_id: setId,
  student_id: student,
  excused_at: null,
  extended_due_at: null,
  feedback: null,
  feedback_at: null,
  reminded_at: null,
  ...over,
})

function set(id: string, published: number, due: number | null, over: Partial<ClassSet> = {}): ClassSet {
  return {
    id,
    classroom_id: 'c',
    title: id,
    kind: 'question_set',
    subject_code: '9709',
    is_mock: false,
    target: 'all',
    due_at: due === null ? null : iso(due),
    published_at: iso(published),
    closed_at: null,
    archived_at: null,
    created_at: iso(published),
    items: [item(`${id}-1`, id, 0), item(`${id}-2`, id, 1)],
    flags: [],
    submissions: [],
    ...over,
  }
}

// --- who is overdue --------------------------------------------------------------------------

const MEMBERS = [
  member('amira', -60), // handed in both
  member('ben', -60), //   handed in one of two
  member('cara', -60), //  nothing, excused
  member('dev', -60), //   nothing, extended to next week
  member('eli', -0.5), //  nothing, but joined after the deadline
  member('fay', -60), //   nothing
  member('gus', -60, 'left'), // left: not chased
]
const DUE_YESTERDAY = set('q', -7, -1, {
  submissions: [sub('q', 'q-1', 'amira', -2), sub('q', 'q-2', 'amira', -2), sub('q', 'q-1', 'ben', -2)],
  flags: [
    flag('q', 'cara', { excused_at: iso(-3) }),
    flag('q', 'dev', { extended_due_at: iso(4) }),
    // An extension that is EARLIER than the due date never shortens it.
    flag('q', 'fay', { extended_due_at: iso(-5) }),
  ],
})
assert.deepEqual(overdueStudentIds(DUE_YESTERDAY, MEMBERS, NOW), ['ben', 'fay'])
assert.deepEqual(
  overdueStudentIds(set('eq', -7, -1), [member('kim', -1)], NOW),
  [],
  'joining at the very instant it was due is not being late'
)
assert.deepEqual(overdueStudentIds(set('future', -2, 3), MEMBERS, NOW), [], 'not due yet')
assert.deepEqual(overdueStudentIds(set('nodue', -2, null), MEMBERS, NOW), [], 'no deadline, never overdue')
assert.deepEqual(
  overdueStudentIds(set('closed', -30, -20), MEMBERS, NOW),
  [],
  'a closed set (past its grace window) is not chased any more'
)
assert.deepEqual(
  overdueStudentIds(set('shut', -7, -1, { closed_at: iso(-0.5) }), MEMBERS, NOW),
  [],
  'nor one the teacher closed'
)
assert.deepEqual(overdueStudentIds(set('empty', -7, -1, { items: [] }), MEMBERS, NOW), [], 'nothing to hand in')
assert.deepEqual(
  overdueStudentIds(set('t', -7, -1, { target: 'students', flags: [flag('t', 'fay', {})] }), MEMBERS, NOW),
  ['fay'],
  'a targeted set chases only its targets'
)

// --- silent classes ----------------------------------------------------------------------------

assert.equal(isSilentClass([member('a', -30)], iso(-20), NOW), true, '20 days without marked work')
assert.equal(isSilentClass([member('a', -30)], iso(-2), NOW), false)
assert.equal(isSilentClass([member('a', -30)], null, NOW), true, 'never any work in 30 days')
assert.equal(isSilentClass([member('a', -5)], null, NOW), false, 'a new class is not silent yet')
assert.equal(isSilentClass([member('a', -30, 'left')], null, NOW), false, 'nobody active: nothing to be silent')
assert.equal(isSilentClass([], null, NOW), false, 'an empty class is not silent')

// --- the desk --------------------------------------------------------------------------------

const input = (over: Partial<OverviewClassInput> & { id: string }): OverviewClassInput => ({
  name: `Class ${over.id}`,
  subject_code: '9709',
  archived_at: null,
  members: [],
  sets: [],
  unreviewed: 0,
  lastActivityAt: iso(-1),
  headlineGap: null,
  ...over,
})

const maths = input({
  id: 'maths',
  members: MEMBERS,
  sets: [
    DUE_YESTERDAY, //                    open (grace), due this week (Thursday)
    set('mon', -9, -4), //               due Monday this week — open, due this week, and all overdue
    set('next', -1, 5), //               open, due next week
    set('old', -40, -30), //             closed
  ],
  unreviewed: 3,
  headlineGap: 'Accuracy — 31% of marks earned',
})
const physics = input({
  id: 'physics',
  subject_code: '9702',
  members: [member('fay', -60), member('hana', -60)],
  sets: [set('p', -8, -2)],
  unreviewed: 2,
  lastActivityAt: iso(-15),
})
const archived = input({
  id: 'old-class',
  archived_at: iso(-100),
  members: [member('ivy', -300), member('jo', -300, 'left')],
  sets: [set('a', -120, -110)],
  unreviewed: 7,
  lastActivityAt: null,
  headlineGap: 'Method — 10% of marks earned',
})

const desk = buildTeacherOverview([archived, maths, physics], NOW)
assert.deepEqual(desk.classes.map((c) => c.id), ['maths', 'physics', 'old-class'], 'archived classes last')

const m = desk.classes[0]
assert.equal(m.members, 6, 'active members only')
assert.equal(m.open_assignments, 3)
assert.equal(m.due_this_week, 2, 'Monday and Thursday; next week is not this week')
assert.equal(m.unreviewed, 3)
assert.equal(m.late_students, 5, 'ben + fay on q; everyone active who joined in time on mon')
assert.equal(m.headline_gap, 'Accuracy — 31% of marks earned')
assert.equal(m.archived, false)

const p = desk.classes[1]
assert.equal(p.late_students, 2)
assert.equal(p.subject_code, '9702')

const a = desk.classes[2]
assert.deepEqual(
  a,
  {
    id: 'old-class',
    name: 'Class old-class',
    subject_code: '9709',
    members: 1,
    open_assignments: 0,
    due_this_week: 0,
    unreviewed: 0,
    late_students: 0,
    headline_gap: null,
    archived: true,
  },
  'an archived class needs nothing from the teacher'
)

assert.deepEqual(desk.needs_you, {
  unreviewed: 5,
  late_students: 6, // amira, ben, cara, dev, fay (maths) + hana (physics); fay counted once
  silent_classes: 1, // physics: 15 days
})

assert.deepEqual(buildTeacherOverview([], NOW), {
  classes: [],
  needs_you: { unreviewed: 0, late_students: 0, silent_classes: 0 },
})

console.log('overview.test.ts: ok')
