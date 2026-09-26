import assert from 'node:assert/strict'
import type { ClassroomAttempt, ClassroomMember } from '@/lib/teacher-analytics'
import type { ClassSet } from '@/lib/teacher-classroom-data'
import type { AssignmentItem, AssignmentStudentFlags, AssignmentSubmission } from '@/lib/teacher/types'
import {
  buildClassWeek,
  completedAt,
  currentIsoWeek,
  DAY_MS,
  improvingStudents,
  isoWeekKey,
  isoWeeksInYear,
  parseIsoWeek,
  pickLastCompletedSet,
  setRoster,
  setsLiveInWindow,
  setStudentStates,
  shiftIsoWeek,
  silentStudents,
  strugglingOnSet,
  summariseSet,
  weekReference,
} from '@/lib/teacher/week'

// --- ISO weeks (UTC) ----------------------------------------------------------------------

assert.equal(isoWeekKey(new Date('2026-09-25T12:00:00Z')), '2026-W39')
assert.equal(isoWeekKey(new Date('2026-09-21T00:00:00Z')), '2026-W39', 'Monday 00:00 opens the week')
assert.equal(isoWeekKey(new Date('2026-09-20T23:59:59Z')), '2026-W38', 'Sunday closes the one before')
assert.equal(isoWeekKey(new Date('2025-12-29T08:00:00Z')), '2026-W01', 'week 1 can start in December')
assert.equal(isoWeekKey(new Date('2021-01-03T08:00:00Z')), '2020-W53', 'and early January can be last year')
assert.equal(isoWeeksInYear(2020), 53)
assert.equal(isoWeeksInYear(2021), 52)
assert.equal(isoWeeksInYear(2026), 53)

const w39 = parseIsoWeek('2026-W39')!
assert.equal(w39.key, '2026-W39')
assert.equal(w39.start.toISOString(), '2026-09-21T00:00:00.000Z')
assert.equal(w39.end.toISOString(), '2026-09-28T00:00:00.000Z')
assert.equal(parseIsoWeek(' 2026-W01 ')!.start.toISOString(), '2025-12-29T00:00:00.000Z')
assert.ok(parseIsoWeek('2020-W53'))
for (const bad of ['2021-W53', '2026-W00', '2026-W54', '2026-39', '2026-w39', '26-W39', '', 'x', null, undefined]) {
  assert.equal(parseIsoWeek(bad as string), null, `rejects ${String(bad)}`)
}
assert.equal(shiftIsoWeek('2026-W01', -1), '2025-W52')
assert.equal(shiftIsoWeek('2020-W53', 1), '2021-W01')
assert.equal(shiftIsoWeek('2026-W39', 0), '2026-W39')
assert.equal(shiftIsoWeek('bad', 1), null)
assert.equal(currentIsoWeek(new Date('2026-09-25T12:00:00Z')).key, '2026-W39')

const NOW = new Date('2026-09-25T12:00:00.000Z') // Friday of W39
assert.equal(weekReference(w39, NOW), NOW.getTime(), 'the current week is judged now')
assert.equal(
  weekReference(parseIsoWeek('2026-W37')!, NOW),
  Date.parse('2026-09-14T00:00:00.000Z') - 1,
  'a past week at its last instant'
)

// --- fixtures: a Chemistry class ------------------------------------------------------------

const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString()

const member = (
  student_id: string,
  joined: number,
  status: ClassroomMember['status'] = 'active',
  gone: number | null = null
): ClassroomMember => ({
  student_id,
  status,
  joined_at: iso(joined),
  left_at: status === 'left' && gone !== null ? iso(gone) : null,
  removed_at: status === 'removed' && gone !== null ? iso(gone) : null,
})

const MEMBERS: ClassroomMember[] = [
  member('amira', -60),
  member('ben', -60),
  member('cara', -60, 'left', -10), // left after the sets below were published
  member('dev', -60, 'removed', -40), // removed long before
  member('eli', -3), // joined this week
]
const NAMES = new Map<string, string | null>([
  ['amira', 'Amira Khan'],
  ['ben', 'Ben Osei'],
  ['cara', 'Cara Lee'],
  ['dev', 'Dev Patel'],
  ['eli', null],
])

function item(id: string, setId: string, position: number, total = 10): AssignmentItem {
  return {
    id,
    assignment_id: setId,
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: `ms-${id}`,
    paper_code: '9701/22',
    paper_session: 'm24',
    question_number: String(position + 1),
    total_marks: total,
    syllabus_tags: ['1.1'],
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
  }
}

function sub(
  setId: string,
  itemId: string,
  student: string,
  at: number,
  marks: number,
  status: AssignmentSubmission['status'] = 'submitted'
): AssignmentSubmission {
  return {
    id: `sub-${itemId}-${student}`,
    assignment_id: setId,
    item_id: itemId,
    student_id: student,
    attempt_id: `att-${itemId}-${student}`,
    attempt_count: 1,
    marks_earned: marks,
    total_marks: 10,
    status,
    source: 'linked',
    first_submitted_at: iso(at),
    last_submitted_at: iso(at),
  }
}

const flag = (setId: string, student: string, over: Partial<AssignmentStudentFlags> = {}): AssignmentStudentFlags => ({
  assignment_id: setId,
  student_id: student,
  excused_at: null,
  extended_due_at: null,
  feedback: null,
  feedback_at: null,
  reminded_at: null,
  ...over,
})

function set(
  id: string,
  over: Partial<ClassSet> & { published: number; due: number | null; closed?: number | null }
): ClassSet {
  const { published, due, closed = null, ...rest } = over
  return {
    id,
    classroom_id: 'class-1',
    title: `Set ${id}`,
    kind: 'question_set',
    subject_code: '9701',
    is_mock: false,
    target: 'all',
    due_at: due === null ? null : iso(due),
    published_at: iso(published),
    closed_at: closed === null ? null : iso(closed),
    archived_at: null,
    created_at: iso(published - 1),
    items: [],
    flags: [],
    submissions: [],
    ...rest,
  }
}

// Last completed set: due 5 days ago. Amira 25%, Ben 90%, Cara (left) 20%.
const LAST = set('last', {
  published: -20,
  due: -5,
  items: [item('l1', 'last', 0), item('l2', 'last', 1)],
  submissions: [
    sub('last', 'l1', 'amira', -6, 3),
    sub('last', 'l2', 'amira', -6, 2),
    sub('last', 'l1', 'ben', -7, 9, 'reviewed'),
    sub('last', 'l2', 'ben', -7, 9),
    sub('last', 'l1', 'cara', -12, 2),
  ],
})
// Open this week, due Monday next week; Amira handed in on time.
const OPEN = set('open', {
  published: -4,
  due: 3,
  items: [item('o1', 'open', 0)],
  submissions: [sub('open', 'o1', 'amira', -1, 7)],
})
// Targeted at Ben only, due two days ago (in grace); Ben missing.
const TARGETED = set('targeted', {
  published: -6,
  due: -2,
  target: 'students',
  items: [item('t1', 'targeted', 0)],
  flags: [flag('targeted', 'ben')],
})
// Old: closed a month ago — not live this week, and older than LAST.
const OLD = set('old', { published: -50, due: -40, closed: -39, items: [item('x1', 'old', 0)] })
// Published after the week (a future week's view).
const DRAFTLIKE = set('later', { published: 10, due: 20, items: [item('z1', 'later', 0)] })

const SETS = [LAST, OPEN, TARGETED, OLD, DRAFTLIKE]

// --- which sets ------------------------------------------------------------------------------

assert.deepEqual(
  setsLiveInWindow(SETS, w39.start.getTime(), w39.end.getTime()).map((s) => s.id).sort(),
  ['last', 'open', 'targeted'],
  'LAST is still inside its grace window this week; OLD closed long ago; LATER is not published yet'
)
assert.equal(completedAt(OPEN), Date.parse(iso(3)))
assert.equal(completedAt(set('noDue', { published: -3, due: null })), null, 'no due date, not closed: never completes')
assert.equal(completedAt(set('early', { published: -9, due: 5, closed: -1 })), Date.parse(iso(-1)), 'closed early')
assert.equal(pickLastCompletedSet(SETS, NOW.getTime())!.id, 'targeted', 'due two days ago beats due five days ago')
assert.equal(pickLastCompletedSet([LAST, OPEN, OLD], NOW.getTime())!.id, 'last')
assert.equal(pickLastCompletedSet([OPEN], NOW.getTime()), null, 'nothing has completed yet')
assert.equal(pickLastCompletedSet([LAST], Date.parse(iso(-10))), null, 'judged at the reference instant')
// Ties break deterministically, never on row order.
const twinA = set('a', { published: -9, due: -1 })
const twinB = set('b', { published: -9, due: -1 })
assert.equal(pickLastCompletedSet([twinA, twinB], NOW.getTime())!.id, 'b')
assert.equal(pickLastCompletedSet([twinB, twinA], NOW.getTime())!.id, 'b')

// --- who a set is for -------------------------------------------------------------------------

assert.deepEqual(
  setRoster(LAST, MEMBERS).map((m) => m.student_id),
  ['amira', 'ben', 'cara', 'eli'],
  'Cara handed in (and left after publish) so shows as LEFT; Dev was removed before it existed'
)
assert.deepEqual(setRoster(TARGETED, MEMBERS).map((m) => m.student_id), ['ben'], 'targeted sets are for their targets')
assert.deepEqual(
  setRoster(set('p', { published: -30, due: -1 }), MEMBERS).map((m) => m.student_id),
  ['amira', 'ben', 'cara', 'eli'],
  'a student who left after publish stays on the roster even without hand-ins'
)
assert.deepEqual(
  setRoster(set('q', { published: -5, due: 2 }), MEMBERS).map((m) => m.student_id),
  ['amira', 'ben', 'eli'],
  'but not one who left before it was set'
)

const lastStates = setStudentStates(LAST, MEMBERS, NAMES)
assert.deepEqual(
  lastStates.map((s) => [s.student_id, s.display_name, s.membership, s.overall_pct]),
  [
    ['amira', 'Amira K.', 'active', 25],
    ['ben', 'Ben O.', 'active', 90],
    ['cara', 'Cara L.', 'left', 20],
    ['eli', 'Student', 'active', null],
  ],
  'names are displayName(), never full names'
)

const lastSummary = summariseSet(LAST, MEMBERS, NAMES, NOW)
assert.deepEqual(
  {
    handed_in: lastSummary.handed_in,
    total_students: lastSummary.total_students,
    item_count: lastSummary.item_count,
    status: lastSummary.status,
    late: lastSummary.late,
  },
  { handed_in: 2, total_students: 4, item_count: 2, status: 'open', late: 0 },
  'Amira and Ben handed in both items; the set is in its grace window'
)

// --- students to watch --------------------------------------------------------------------------

assert.deepEqual(strugglingOnSet(lastStates), [{ id: 'amira', display_name: 'Amira K.', pct: 25 }], 'active and below 40%')

let seq = 0
const att = (user: string, day: number, earned: number, total = 10): ClassroomAttempt => ({
  id: `a${++seq}`,
  user_id: user,
  marks_earned: earned,
  total_marks: total,
  syllabus_tags: ['1.1'],
  created_at: iso(day),
})

const attempts: ClassroomAttempt[] = [
  // Amira: active recently and rising — 40% five weeks ago, 80% this fortnight.
  att('amira', -35, 4),
  att('amira', -30, 4),
  att('amira', -20, 4),
  att('amira', -10, 8),
  att('amira', -5, 8),
  att('amira', -1, 8),
  // Ben: last marked 20 days ago.
  att('ben', -20, 5),
  // A future-dated row (clock skew) is ignored.
  att('ben', 2, 5),
]

assert.deepEqual(
  silentStudents(MEMBERS, attempts, NAMES, NOW.getTime()),
  [{ id: 'ben', display_name: 'Ben O.', days_silent: 20 }],
  'Eli joined three days ago (not silent yet); Cara and Dev are not members'
)
assert.deepEqual(
  silentStudents([member('fay', -30)], [], NAMES, NOW.getTime()),
  [{ id: 'fay', display_name: 'Student', days_silent: 30 }],
  'never marked anything: counted from the day they joined'
)

assert.deepEqual(improvingStudents(MEMBERS, attempts, NAMES, NOW.getTime()), [
  { id: 'amira', display_name: 'Amira K.', delta_pct: 40 },
])
assert.deepEqual(
  improvingStudents(MEMBERS, attempts.slice(0, 5), NAMES, NOW.getTime()),
  [],
  'two recent attempts are not a trend'
)

// --- the week ----------------------------------------------------------------------------------

const hydrated = [LAST, OPEN, TARGETED]
const week = buildClassWeek({
  classroomId: 'class-1',
  week: w39,
  now: NOW,
  archived: false,
  members: MEMBERS,
  names: NAMES,
  sets: hydrated,
  attempts,
  gapAttempts: [
    { user_id: 'amira', marks_earned: 1, total_marks: 6, ai_marking: { marks_awarded: marks('An', 6, 1) } },
    { user_id: 'ben', marks_earned: 2, total_marks: 6, ai_marking: { marks_awarded: marks('An', 6, 2) } },
    { user_id: 'cara', marks_earned: 1, total_marks: 6, ai_marking: { marks_awarded: marks('An', 6, 1) } },
  ],
  submissionsInWeek: 3,
  unreviewed: 4,
})

function marks(type: string, n: number, earned: number) {
  return Array.from({ length: n }, (_, i) => ({ type: `${type}${i + 1}`, earned: i < earned }))
}

assert.equal(week.classroom_id, 'class-1')
assert.equal(week.week, '2026-W39')
assert.deepEqual(
  week.assignments.map((a) => a.id),
  ['last', 'targeted', 'open'],
  'live sets, soonest due first'
)
assert.equal(week.assignments.find((a) => a.id === 'targeted')!.total_students, 1)
assert.equal(week.submissions_delta, 3)
assert.deepEqual(week.silent_students.map((s) => s.id), ['ben'])
assert.deepEqual(week.struggling, [], "the last completed set is TARGETED, and Ben hasn't handed it in")
assert.deepEqual(week.improving.map((s) => s.id), ['amira'])
assert.equal(week.headline_gap, 'Analysis — 22% of marks earned')
assert.equal(week.unreviewed, 4)

// A past week: judged at its end, so the targeted set (due in W39) had not completed yet.
const w38 = parseIsoWeek('2026-W38')!
const past = buildClassWeek({
  classroomId: 'class-1',
  week: w38,
  now: NOW,
  archived: false,
  members: MEMBERS,
  names: NAMES,
  sets: hydrated,
  attempts,
  gapAttempts: [],
  submissionsInWeek: 0,
  unreviewed: 0,
})
assert.deepEqual(past.struggling, [{ id: 'amira', display_name: 'Amira K.', pct: 25 }], 'LAST was the last completed set then')
assert.equal(past.headline_gap, null, 'no hand-ins with marking: no headline')

// An archived class: retained hand-ins only, nothing from live attempts.
const archived = buildClassWeek({
  classroomId: 'class-1',
  week: w38,
  now: NOW,
  archived: true,
  members: MEMBERS,
  names: NAMES,
  sets: hydrated,
  attempts,
  gapAttempts: [],
  submissionsInWeek: 2,
  unreviewed: 9,
})
assert.deepEqual(archived.silent_students, [])
assert.deepEqual(archived.improving, [])
assert.equal(archived.headline_gap, null)
assert.equal(archived.unreviewed, 0, 'nothing to review in a read-only class')
assert.equal(archived.struggling.length, 1, 'but the retained marks still say who struggled')
assert.equal(archived.submissions_delta, 2)

// An empty class.
const empty = buildClassWeek({
  classroomId: 'class-2',
  week: w39,
  now: NOW,
  archived: false,
  members: [],
  names: new Map(),
  sets: [],
  attempts: [],
  gapAttempts: [],
  submissionsInWeek: 0,
  unreviewed: 0,
})
assert.deepEqual(empty, {
  classroom_id: 'class-2',
  week: '2026-W39',
  assignments: [],
  submissions_delta: 0,
  silent_students: [],
  struggling: [],
  improving: [],
  headline_gap: null,
  unreviewed: 0,
})

console.log('week.test.ts: ok')
