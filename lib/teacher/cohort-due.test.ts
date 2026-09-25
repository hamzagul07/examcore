import assert from 'node:assert/strict'
import {
  buildCohortDueList,
  countDueByStudent,
  dueRowsFromTables,
  type CohortDueRow,
  type RecallTableRow,
  type ScheduleTableRow,
} from './cohort-due'

// --- ranking a class's due topics -------------------------------------------------------------

const rows: CohortDueRow[] = [
  { userId: 'a', subjectCode: '9702', topicCode: '1.1', source: 'attempts', dueAt: '2026-01-01T00:00:00Z' },
  { userId: 'b', subjectCode: '9702', topicCode: '1.1', source: 'recall', dueAt: '2026-01-01T00:00:00Z' },
  { userId: 'a', subjectCode: '9702', topicCode: '1.1', source: 'recall', dueAt: '2026-01-02T00:00:00Z' },
  { userId: 'c', subjectCode: '9702', topicCode: '2.1', source: 'attempts', dueAt: '2026-01-01T00:00:00Z' },
]

const list = buildCohortDueList({
  totalStudents: 10,
  rows,
  names: { a: 'Ada', b: 'Ben', c: 'Cia' },
  topicNames: { '9702::1.1': 'Forces', '9702::2.1': 'Waves' },
  subjectLabels: { '9702': 'Physics' },
})

assert.equal(list.length, 2, 'two topics')
assert.equal(list[0].topicCode, '1.1')
assert.equal(list[0].studentsDue, 2, 'a student due twice on a topic is one student')
assert.equal(list[0].name, 'Forces')
assert.equal(list[0].subjectLabel, 'Physics')
assert.equal(list[0].source, 'both')
assert.equal(list[0].duePct, 20)
assert.deepEqual(list[0].sampleNames, ['Ada', 'Ben'])
assert.equal(list[1].name, 'Waves')
assert.equal(list[1].studentsDue, 1)

assert.deepEqual(buildCohortDueList({ totalStudents: 0, rows, names: {} }), [], 'empty roster')
assert.deepEqual(buildCohortDueList({ totalStudents: 5, rows: [], names: {} }), [], 'no rows')
assert.equal(
  buildCohortDueList({ totalStudents: 5, rows, names: {} })[0].sampleNames[0],
  'Student',
  'a missing name falls back'
)
assert.equal(buildCohortDueList({ totalStudents: 5, rows, names: {}, limit: 1 }).length, 1, 'limit')

const counts = countDueByStudent(rows)
assert.deepEqual(counts, { a: 1, b: 1, c: 1 }, 'unique topics per student')
assert.equal(
  countDueByStudent([rows[0], { ...rows[0], source: 'recall', dueAt: '2026-01-02T00:00:00Z' }]).a,
  1,
  'attempt + recall on one topic is one due topic'
)

// --- from the schedule tables, scoped to a classroom ---------------------------------------------

const NOW = Date.parse('2026-09-25T12:00:00Z')
const JOINED = new Map([
  ['amira', '2026-09-01T00:00:00Z'],
  ['ben', '2026-09-20T00:00:00Z'],
])

const sched = (
  user: string,
  subject: string,
  topic: string,
  due: string,
  last: string | null
): ScheduleTableRow => ({ user_id: user, subject_code: subject, topic_code: topic, due_at: due, last_reviewed_at: last })

const recall = (
  user: string,
  subject: string,
  lesson: string,
  topic: string,
  due: string,
  last: string
): RecallTableRow => ({
  user_id: user,
  subject_code: subject,
  lesson_slug: lesson,
  topic_code: topic,
  answered_count: 3,
  total_count: 3,
  due_at: due,
  last_worked_at: last,
})

const schedule: ScheduleTableRow[] = [
  sched('amira', '9701', '1.1', '2026-09-24T00:00:00Z', '2026-09-10T00:00:00Z'), // in scope
  sched('amira', '9701', '1.2', '2026-09-30T00:00:00Z', '2026-09-10T00:00:00Z'), // not due yet
  sched('amira', '9709', '1.1', '2026-09-24T00:00:00Z', '2026-09-10T00:00:00Z'), // another subject
  sched('ben', '9701', '2.1', '2026-09-24T00:00:00Z', '2026-09-05T00:00:00Z'), //  worked before Ben joined
  sched('ben', '9701', '2.2', '2026-09-24T00:00:00Z', null), //                     no activity time: fail closed
  sched('zed', '9701', '1.1', '2026-09-24T00:00:00Z', '2026-09-10T00:00:00Z'), //  not a member
]
const recallRows: RecallTableRow[] = [
  // Same topic as a due marked-work row: the marked signal wins.
  recall('amira', '9701', 'atoms-intro', '1.1', '2026-09-20T00:00:00Z', '2026-09-15T00:00:00Z'),
  // Marked on 1.2 too (not due yet): still suppresses the quick check.
  recall('amira', '9701', 'isotopes', '1.2', '2026-09-20T00:00:00Z', '2026-09-15T00:00:00Z'),
  // Two lessons on one topic → one row, the earlier due date.
  recall('amira', '9701', 'orbitals-a', '1.3', '2026-09-22T00:00:00Z', '2026-09-12T00:00:00Z'),
  recall('amira', '9701', 'orbitals-b', '1.3', '2026-09-21T00:00:00Z', '2026-09-12T00:00:00Z'),
  // Ben worked this lesson after joining: in.
  recall('ben', '9701', 'moles', '2.3', '2026-09-23T00:00:00Z', '2026-09-21T00:00:00Z'),
  // …and this one before joining: out.
  recall('ben', '9701', 'bonding', '3.1', '2026-09-23T00:00:00Z', '2026-09-19T00:00:00Z'),
  // A physics lesson with the same topic code as a chemistry one: out, and must not lend its date.
  recall('ben', '9702', 'forces', '2.3', '2026-09-01T00:00:00Z', '2026-09-21T00:00:00Z'),
]

const scoped = dueRowsFromTables({
  schedule,
  recall: recallRows,
  nowMs: NOW,
  subjectCode: '9701',
  joinedAt: JOINED,
})
const key = (r: CohortDueRow) => `${r.userId} ${r.subjectCode} ${r.topicCode} ${r.source} ${r.dueAt}`
assert.deepEqual(scoped.map(key).sort(), [
  'amira 9701 1.1 attempts 2026-09-24T00:00:00Z',
  'amira 9701 1.3 recall 2026-09-21T00:00:00Z',
  'ben 9701 2.3 recall 2026-09-23T00:00:00Z',
])

// Without a join map (a student's own view) the join rule does not apply; subject still does.
const unscoped = dueRowsFromTables({ schedule, recall: recallRows, nowMs: NOW, subjectCode: '9701' })
assert.ok(unscoped.some((r) => r.userId === 'ben' && r.topicCode === '2.1'))
assert.ok(unscoped.some((r) => r.userId === 'zed'))
assert.ok(!unscoped.some((r) => r.subjectCode !== '9701'))

// No subject: every subject, and each recall row keeps its own lesson's due date.
const every = dueRowsFromTables({ schedule, recall: recallRows, nowMs: NOW, joinedAt: JOINED })
const physics = every.find((r) => r.subjectCode === '9702')!
assert.equal(physics.dueAt, '2026-09-01T00:00:00Z', 'matched on subject and lesson, not on topic code alone')
assert.ok(every.some((r) => r.subjectCode === '9709'))

assert.deepEqual(
  dueRowsFromTables({ schedule: [], recall: [], nowMs: NOW, subjectCode: '9701', joinedAt: new Map() }),
  [],
  'an empty class has nothing due'
)

console.log('cohort-due.test.ts: ok')
