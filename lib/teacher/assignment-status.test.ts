import assert from 'node:assert/strict'
import {
  AUTO_CLOSE_AFTER_DUE_DAYS,
  HANDED_IN_STATES,
  assignmentStatus,
  deriveStudentState,
  effectiveCloseAt,
  effectiveDueAt,
  isLate,
  summariseProgress,
} from '@/lib/teacher/assignment-status'
import type {
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  MembershipStatus,
  StudentAssignmentState,
} from '@/lib/teacher/types'

// --- fixtures ------------------------------------------------------------------

const DUE = '2026-10-02T16:00:00.000Z'
const BEFORE = '2026-10-01T09:00:00.000Z'
const AFTER = '2026-10-03T09:00:00.000Z'
const EXTENSION = '2026-10-05T16:00:00.000Z'

function item(id: string, position: number, total: number | null = 10): AssignmentItem {
  return {
    id,
    assignment_id: 'a1',
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: `ms-${id}`,
    paper_code: '9709/12',
    paper_session: 'm24',
    question_number: String(position + 1),
    total_marks: total,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
  }
}

function sub(
  itemId: string,
  at: string,
  marks: number | null,
  opts: Partial<AssignmentSubmission> = {}
): AssignmentSubmission {
  return {
    id: `sub-${itemId}-${at}`,
    assignment_id: 'a1',
    item_id: itemId,
    student_id: 's1',
    attempt_id: `att-${itemId}`,
    attempt_count: 1,
    marks_earned: marks,
    total_marks: 10,
    status: 'submitted',
    source: 'linked',
    first_submitted_at: at,
    last_submitted_at: at,
    ...opts,
  }
}

function flags(opts: Partial<AssignmentStudentFlags> = {}): AssignmentStudentFlags {
  return {
    assignment_id: 'a1',
    student_id: 's1',
    excused_at: null,
    extended_due_at: null,
    feedback: null,
    feedback_at: null,
    reminded_at: null,
    ...opts,
  }
}

const ITEMS = [item('q2', 1), item('q1', 0)] // deliberately out of order

function state(
  membership: MembershipStatus,
  submissions: AssignmentSubmission[],
  f: AssignmentStudentFlags | null = null,
  dueAt: string | null = DUE
) {
  return deriveStudentState({ membership, items: ITEMS, submissions, flags: f, due_at: dueAt })
}

// --- isLate ----------------------------------------------------------------------

assert.equal(isLate(BEFORE, DUE, null), false, 'before the deadline is on time')
assert.equal(isLate(DUE, DUE, null), false, 'exactly at the deadline is on time')
assert.equal(isLate(AFTER, DUE, null), true, 'after the deadline is late')
assert.equal(isLate(AFTER, null, null), false, 'no due date: never late')
assert.equal(isLate(AFTER, DUE, EXTENSION), false, 'an extension moves the deadline')
assert.equal(isLate('2026-10-06T09:00:00.000Z', DUE, EXTENSION), true, 'past the extension is late')
assert.equal(
  isLate(AFTER, DUE, '2026-09-30T00:00:00.000Z'),
  true,
  'an "extension" earlier than the due date never shortens it — still judged against due'
)
assert.equal(
  isLate(BEFORE, DUE, '2026-09-30T00:00:00.000Z'),
  false,
  'an earlier extension cannot make on-time work late'
)
assert.equal(isLate(AFTER, null, EXTENSION), false, 'extension alone is a deadline')
assert.equal(isLate('2026-10-06T00:00:00.000Z', null, EXTENSION), true, 'extension alone is a deadline')
assert.equal(isLate('not a date', DUE, null), false, 'unreadable hand-in time is not assumed late')
assert.equal(isLate(AFTER, 'garbage', null), false, 'unreadable due date means no deadline')
assert.equal(isLate(AFTER, DUE, 'garbage'), true, 'unreadable extension is ignored, due still applies')

assert.equal(effectiveDueAt(DUE, EXTENSION), EXTENSION)
assert.equal(effectiveDueAt(null, null), null)
assert.equal(effectiveDueAt(DUE, null), DUE)

// --- deriveStudentState: the late / extended / excused / left matrix ---------------

{
  const s = state('active', [sub('q1', BEFORE, 7), sub('q2', BEFORE, 5)])
  assert.deepEqual(
    s.items.map((i) => i.item_id),
    ['q1', 'q2'],
    'items come back in position order'
  )
  assert.deepEqual(s.items.map((i) => i.state), ['done', 'done'])
  assert.equal(s.is_late, false)
  assert.equal(s.overall_pct, 60, '12 of 20')
  assert.equal(s.items[0].attempt_id, 'att-q1')
}

{
  const s = state('active', [sub('q1', AFTER, 7)])
  assert.deepEqual(s.items.map((i) => i.state), ['late', 'missing'], 'late hand-in, other item missing')
  assert.equal(s.is_late, true)
  assert.equal(s.overall_pct, 70, 'percentage is over the work handed in, not the whole set')
}

{
  const s = state('active', [sub('q1', AFTER, 7)], flags({ extended_due_at: EXTENSION }))
  assert.equal(s.items[0].state, 'done', 'extension granted after the fact clears the late mark')
  assert.equal(s.is_late, false)
  assert.equal(s.extended_due_at, EXTENSION)
}

{
  const s = state('active', [sub('q1', BEFORE, 7, { status: 'late' })])
  assert.equal(s.items[0].state, 'done', 'stored status is not trusted for lateness; timestamps are')
}

{
  const s = state('active', [sub('q1', AFTER, 9, { status: 'reviewed' })])
  assert.equal(s.items[0].state, 'reviewed', 'a reviewed cell shows as reviewed')
  assert.equal(s.is_late, true, 'but the student still handed it in late')
}

{
  const s = state('active', [], flags({ excused_at: BEFORE, feedback: 'Off sick' }))
  assert.deepEqual(s.items.map((i) => i.state), ['excused', 'excused'])
  assert.equal(s.excused, true)
  assert.equal(s.feedback, 'Off sick')
  assert.equal(s.overall_pct, null, 'no work, no percentage (not 0%)')
}

{
  const s = state('active', [sub('q1', BEFORE, 4)], flags({ excused_at: BEFORE }))
  assert.deepEqual(s.items.map((i) => i.state), ['done', 'excused'], 'work done outranks the excuse')
}

for (const membership of ['left', 'removed'] as const) {
  const s = state(membership, [])
  assert.deepEqual(s.items.map((i) => i.state), ['left', 'left'], `${membership}: shown as LEFT`)
  const kept = state(membership, [sub('q2', BEFORE, 8)], flags({ excused_at: BEFORE }))
  assert.deepEqual(
    kept.items.map((i) => i.state),
    ['left', 'done'],
    `${membership}: marks earned while a member are kept; left outranks excused`
  )
  assert.equal(kept.membership, membership)
}

{
  const s = state('active', [sub('q1', AFTER, 7)], null, null)
  assert.equal(s.items[0].state, 'done', 'no due date: never late')
}

{
  const s = state('active', [sub('q1', BEFORE, 3), sub('q1', BEFORE, 8), sub('zz', BEFORE, 10)])
  assert.equal(s.items[0].marks_earned, 8, 'duplicate rows for one item: the better mark counts')
  assert.equal(s.items.length, 2, 'submissions for items outside the set are ignored')
}

{
  const s = deriveStudentState({
    membership: 'active',
    items: [item('q1', 0, null)],
    submissions: [sub('q1', BEFORE, 4, { total_marks: null })],
    flags: null,
    due_at: DUE,
  })
  assert.equal(s.items[0].state, 'done')
  assert.equal(s.overall_pct, null, 'a hand-in with no known total contributes no percentage')
}

{
  const s = deriveStudentState({
    membership: 'active',
    items: [item('q1', 0, 6)],
    submissions: [sub('q1', BEFORE, 3, { total_marks: null })],
    flags: null,
    due_at: DUE,
  })
  assert.equal(s.items[0].total_marks, 6, "falls back to the item's own total")
  assert.equal(s.overall_pct, 50)
}

{
  const s = deriveStudentState({
    membership: 'active',
    items: [item('q1', 0, 3)],
    submissions: [sub('q1', BEFORE, 1, { total_marks: 3 })],
    flags: null,
    due_at: DUE,
  })
  assert.equal(s.overall_pct, 33.3, 'rounded to one decimal place')
}

// --- summariseProgress -----------------------------------------------------------------

function named(id: string, s: ReturnType<typeof state>): StudentAssignmentState {
  return { ...s, student_id: id, display_name: id }
}

{
  const states = [
    named('complete-on-time', state('active', [sub('q1', BEFORE, 10), sub('q2', BEFORE, 6)])), // 80%
    named('complete-late', state('active', [sub('q1', AFTER, 4), sub('q2', BEFORE, 4)])), // 40%
    named('partial', state('active', [sub('q1', BEFORE, 7)])), // 70%
    named('nothing', state('active', [])),
    named('excused', state('active', [], flags({ excused_at: BEFORE }))),
    named('left-empty', state('left', [])),
    named('left-complete', state('removed', [sub('q1', BEFORE, 5), sub('q2', BEFORE, 5)])), // 50%
  ]
  const p = summariseProgress(states, ITEMS)
  assert.equal(p.total_students, 7)
  assert.equal(p.handed_in, 3, 'every item handed in (a student who left afterwards still counts)')
  assert.equal(p.missing, 2, 'part-way through is still missing')
  assert.equal(p.excused, 1)
  assert.equal(p.left, 1)
  assert.equal(
    p.handed_in + p.missing + p.excused + p.left,
    p.total_students,
    'the four buckets partition the class'
  )
  assert.equal(p.late, 1, 'late is an overlay on the buckets')
  assert.equal(p.class_mean_pct, 60, 'mean of per-student percentages: (80 + 40 + 70 + 50) / 4')
  assert.deepEqual(
    p.per_item,
    [
      { item_id: 'q1', mean_pct: 65, n: 4 },
      { item_id: 'q2', mean_pct: 50, n: 3 },
    ],
    'per-item means over hand-ins only, in position order'
  )
}

{
  const p = summariseProgress([], ITEMS)
  assert.equal(p.total_students, 0)
  assert.equal(p.class_mean_pct, null, 'no students: no mean')
  assert.deepEqual(p.per_item.map((i) => i.mean_pct), [null, null])
  assert.deepEqual(p.per_item.map((i) => i.n), [0, 0])
}

{
  const empty = deriveStudentState({ membership: 'active', items: [], submissions: [], flags: null, due_at: DUE })
  const p = summariseProgress([named('s', empty)], [])
  assert.equal(p.handed_in, 0, 'a set with no items has nothing to hand in')
  assert.equal(p.missing, 1)
}

assert.ok(HANDED_IN_STATES.has('reviewed') && !HANDED_IN_STATES.has('excused'))

// --- assignmentStatus ----------------------------------------------------------------------

const NOW = new Date('2026-10-04T12:00:00.000Z')
const base = { published_at: '2026-09-28T09:00:00.000Z', closed_at: null, archived_at: null, due_at: DUE }

assert.equal(assignmentStatus({ ...base, published_at: null }, NOW), 'draft', 'unpublished is a draft')
assert.equal(
  assignmentStatus({ ...base, published_at: null, archived_at: BEFORE }, NOW),
  'draft',
  'an archived draft is still a draft'
)
assert.equal(assignmentStatus(base, NOW), 'open', 'past due but inside the grace window is open')
assert.equal(assignmentStatus({ ...base, due_at: null }, NOW), 'open', 'no due date, never closed: open')
assert.equal(assignmentStatus({ ...base, closed_at: BEFORE }, NOW), 'closed', 'closed by the teacher')
assert.equal(
  assignmentStatus({ ...base, closed_at: '2026-10-10T00:00:00.000Z' }, NOW),
  'open',
  'a close scheduled for later is still open'
)
assert.equal(assignmentStatus({ ...base, archived_at: BEFORE }, NOW), 'closed', 'archived')
{
  const graceEnds = new Date(Date.parse(DUE) + AUTO_CLOSE_AFTER_DUE_DAYS * 86_400_000)
  assert.equal(assignmentStatus(base, new Date(graceEnds.getTime() - 1)), 'open', 'last moment of grace')
  assert.equal(assignmentStatus(base, graceEnds), 'closed', 'auto-closes at the end of the grace window')
  assert.equal(effectiveCloseAt(base), graceEnds.toISOString())
}
assert.equal(
  effectiveCloseAt({ closed_at: BEFORE, due_at: DUE }),
  BEFORE,
  'the earlier of manual close and auto close'
)
assert.equal(effectiveCloseAt({ closed_at: null, due_at: null }), null)
assert.equal(
  assignmentStatus({ ...base, closed_at: '2000-01-01T00:00:00.000Z' }, new Date('invalid')),
  'closed',
  'an invalid clock falls back to the real one rather than comparing against NaN'
)

console.log('assignment-status.test.ts — all assertions passed')
