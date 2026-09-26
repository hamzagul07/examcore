import assert from 'node:assert/strict'
import type { StudentAssignmentState } from '@/lib/teacher/types'
import {
  LATE_GROUP_ORDER,
  LATE_GROUP_TITLE,
  extensionBase,
  handedInPhrase,
  isValidExtension,
  lateGroups,
} from '@/components/teacher/assignments/late-groups'

type Item = StudentAssignmentState['items'][number]
const cells = (...states: Item['state'][]): Item[] =>
  states.map((state, i) => ({ item_id: `i${i}`, state, marks_earned: null, total_marks: null, attempt_id: null }))
const st = (student_id: string, over: Partial<StudentAssignmentState>): StudentAssignmentState => ({
  student_id,
  display_name: student_id[0].toUpperCase() + student_id.slice(1),
  membership: 'active',
  items: cells('missing', 'missing'),
  overall_pct: null,
  is_late: false,
  excused: false,
  extended_due_at: null,
  feedback: null,
  ...over,
})

const DUE = '2026-10-02T15:00:00.000Z'
const AFTER = new Date('2026-10-03T09:00:00.000Z')
const BEFORE = new Date('2026-10-01T09:00:00.000Z')

const STUDENTS: StudentAssignmentState[] = [
  st('zoe', {}), // owes everything
  st('amira', { items: cells('done', 'done') }), // on time, complete — not listed
  st('ben', { items: cells('late', 'done'), is_late: true }), // handed in late
  st('cara', { items: cells('late', 'missing'), is_late: true }), // part-way, late
  st('dev', { excused: true, items: cells('excused', 'excused') }),
  st('eli', { extended_due_at: '2026-10-09T15:00:00.000Z' }), // extension not reached
  st('fay', { membership: 'left', items: cells('left', 'left') }), // not actionable
  st('gus', { excused: true, items: cells('done', 'done') }), // excused but did it anyway — not listed
]

const after = lateGroups(STUDENTS, DUE, AFTER)
assert.deepEqual(
  after.overdue.map((r) => r.student_id),
  ['cara', 'zoe'],
  'past the deadline, A–Z; part-way late students owe work'
)
assert.deepEqual(
  after.late.map((r) => r.student_id),
  ['ben']
)
assert.deepEqual(
  after.owing.map((r) => r.student_id),
  ['eli'],
  'an extension moves the deadline'
)
assert.deepEqual(
  after.excused.map((r) => r.student_id),
  ['dev']
)
assert.equal(after.overdue[1].deadline, DUE)
assert.equal(after.owing[0].deadline, '2026-10-09T15:00:00.000Z')
const listed = LATE_GROUP_ORDER.flatMap((g) => after[g].map((r) => r.student_id))
assert.ok(!listed.includes('fay'), 'students who left are not actionable')
assert.ok(!listed.includes('amira'))
assert.ok(!listed.includes('gus'), 'work handed in outranks the excuse')

const before = lateGroups(STUDENTS, DUE, BEFORE)
assert.deepEqual(before.overdue, [])
assert.deepEqual(
  before.owing.map((r) => r.student_id),
  ['cara', 'eli', 'zoe']
)

const noDeadline = lateGroups(STUDENTS, null, AFTER)
assert.deepEqual(noDeadline.overdue, [], 'no deadline: nobody is overdue')
assert.equal(noDeadline.owing.find((r) => r.student_id === 'zoe')?.deadline, null)

assert.deepEqual(lateGroups([st('x', { items: [] })], DUE, AFTER).overdue.length, 1, 'a set with no items is still owed')

assert.deepEqual([...LATE_GROUP_ORDER], ['overdue', 'late', 'owing', 'excused'])
assert.equal(LATE_GROUP_TITLE.overdue, 'Past the deadline')

assert.equal(handedInPhrase({ handed_in: 2, items: 4 }), '2 of 4 handed in')
assert.equal(handedInPhrase({ handed_in: 0, items: 4 }), 'Nothing handed in')
assert.equal(handedInPhrase({ handed_in: 4, items: 4 }), 'All 4 handed in')
assert.equal(handedInPhrase({ handed_in: 1, items: 1 }), 'Handed in')
assert.equal(handedInPhrase({ handed_in: 0, items: 0 }), 'Nothing to hand in')

assert.equal(extensionBase(DUE, null), DUE)
assert.equal(extensionBase(DUE, '2026-10-09T15:00:00.000Z'), '2026-10-09T15:00:00.000Z')
assert.equal(extensionBase(DUE, '2026-09-01T15:00:00.000Z'), DUE, 'an earlier extension never shortens the base')
assert.equal(extensionBase(null, '2026-10-09T15:00:00.000Z'), null, 'nothing to extend without a due date')

assert.equal(isValidExtension('2026-10-03T15:00:00.000Z', DUE), true)
assert.equal(isValidExtension(DUE, DUE), false, 'must be strictly later')
assert.equal(isValidExtension('2026-10-01T15:00:00.000Z', DUE), false)
assert.equal(isValidExtension(null, DUE), false)
assert.equal(isValidExtension('2026-10-03T15:00:00.000Z', null), false)

console.log('late-groups.test.ts — all assertions passed')
