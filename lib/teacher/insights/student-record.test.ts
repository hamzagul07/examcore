import assert from 'node:assert/strict'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import type { AssignmentItem, AssignmentStudentFlags, AssignmentSubmission } from '@/lib/teacher/types'
import {
  buildStudentSetRecord,
  latestSetByStudent,
  pickLatestSet,
  summariseStudentRecord,
  type RecordSet,
} from '@/lib/teacher/insights/student-record'

const NOW = new Date('2026-09-25T12:00:00Z')
const AMIRA = 'a0000000-0000-4000-8000-000000000001'
const BEN = 'b0000000-0000-4000-8000-000000000002'
const CARA = 'c0000000-0000-4000-8000-000000000003'

function member(id: string, over: Partial<ClassroomMember> = {}): ClassroomMember {
  return { student_id: id, status: 'active', joined_at: '2026-09-01T00:00:00Z', left_at: null, removed_at: null, ...over }
}

function item(setId: string, position: number, total = 5): AssignmentItem {
  return {
    id: `${setId}-i${position}`,
    assignment_id: setId,
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: null,
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: String(position + 1),
    total_marks: total,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
  }
}

function sub(setId: string, position: number, student: string, at: string, earned = 4, status: AssignmentSubmission['status'] = 'submitted'): AssignmentSubmission {
  return {
    id: `${setId}-${student}-${position}`,
    assignment_id: setId,
    item_id: `${setId}-i${position}`,
    student_id: student,
    attempt_id: `att-${setId}-${student}-${position}`,
    attempt_count: 1,
    marks_earned: earned,
    total_marks: 5,
    status,
    source: 'linked',
    first_submitted_at: at,
    last_submitted_at: at,
  }
}

function flag(setId: string, student: string, over: Partial<AssignmentStudentFlags> = {}): AssignmentStudentFlags {
  return {
    assignment_id: setId,
    student_id: student,
    excused_at: null,
    extended_due_at: null,
    feedback: null,
    feedback_at: null,
    reminded_at: null,
    ...over,
  }
}

function set(id: string, over: Partial<RecordSet> = {}): RecordSet {
  return {
    id,
    classroom_id: 'class',
    title: `Set ${id}`,
    kind: 'question_set',
    is_mock: false,
    target: 'all',
    due_at: '2026-09-20T16:00:00Z',
    published_at: '2026-09-10T09:00:00Z',
    closed_at: null,
    archived_at: null,
    items: [item(id, 0), item(id, 1)],
    flags: [],
    submissions: [],
    ...over,
  }
}

// --- one student's record -------------------------------------------------------------------

{
  const sets: RecordSet[] = [
    // Handed in on time.
    set('done', { submissions: [sub('done', 0, AMIRA, '2026-09-19T10:00:00Z', 5), sub('done', 1, AMIRA, '2026-09-19T10:00:00Z', 3)] }),
    // Late on one item.
    set('late', {
      due_at: '2026-09-18T16:00:00Z',
      submissions: [sub('late', 0, AMIRA, '2026-09-17T10:00:00Z'), sub('late', 1, AMIRA, '2026-09-19T10:00:00Z')],
    }),
    // Half done, past the deadline.
    set('part', { submissions: [sub('part', 0, AMIRA, '2026-09-19T10:00:00Z')] }),
    // Nothing, past the deadline.
    set('miss', { due_at: '2026-09-15T16:00:00Z' }),
    // Nothing, due next week.
    set('todo', { due_at: '2026-10-02T16:00:00Z', published_at: '2026-09-24T09:00:00Z' }),
    // Excused.
    set('exc', { flags: [flag('exc', AMIRA, { excused_at: '2026-09-12T00:00:00Z' })] }),
    // Extended past today: to do, and the row shows her own deadline.
    set('ext', { flags: [flag('ext', AMIRA, { extended_due_at: '2026-09-30T16:00:00Z' })] }),
    // Due before she joined.
    set('old', { due_at: '2026-08-20T16:00:00Z', published_at: '2026-08-10T09:00:00Z' }),
    // For other students only.
    set('targeted', { target: 'students', flags: [flag('targeted', BEN)] }),
    // A draft is not a set yet.
    set('draft', { published_at: null }),
  ]
  const rows = buildStudentSetRecord(sets, member(AMIRA), NOW)
  const by = new Map(rows.map((r) => [r.id, r]))

  assert.equal(by.has('targeted'), false, 'a set targeted at others is not on her record')
  assert.equal(by.has('draft'), false)
  assert.equal(by.get('done')?.outcome, 'complete')
  assert.equal(by.get('done')?.overall_pct, 80)
  assert.equal(by.get('done')?.handed_in, 2)
  assert.equal(by.get('late')?.outcome, 'late')
  assert.equal(by.get('part')?.outcome, 'partial')
  assert.equal(by.get('miss')?.outcome, 'missing')
  assert.equal(by.get('todo')?.outcome, 'to_do')
  assert.equal(by.get('todo')?.status, 'open')
  assert.equal(by.get('exc')?.outcome, 'excused')
  assert.equal(by.get('ext')?.outcome, 'to_do')
  assert.equal(by.get('ext')?.due_at, '2026-09-30T16:00:00.000Z')
  assert.equal(by.get('ext')?.extended, true)
  assert.equal(by.get('done')?.extended, false)
  assert.equal(by.get('old')?.outcome, 'before_joining')
  assert.deepEqual(
    by.get('done')?.cells.map((c) => c.state),
    ['done', 'done'],
    'cells are the shared deriveStudentState items'
  )

  // Newest deadline first — her own deadline, extension included.
  assert.deepEqual(
    rows.slice(0, 2).map((r) => r.id),
    ['todo', 'ext']
  )
  assert.equal(rows[rows.length - 1].id, 'old')

  assert.deepEqual(summariseStudentRecord(rows), {
    sets: 7, // everything but "before joining"
    handedIn: 2,
    late: 1,
    missing: 1,
    open: 3, // todo, ext, and part — past its deadline but inside the grace week, so still taking work
  })
}

{
  // A reviewed hand-in counts as handed in; a closed set with no deadline and nothing in is missing.
  const rows = buildStudentSetRecord(
    [
      set('rv', { submissions: [sub('rv', 0, AMIRA, '2026-09-19T10:00:00Z', 5, 'reviewed'), sub('rv', 1, AMIRA, '2026-09-19T10:00:00Z')] }),
      set('closed', { due_at: null, closed_at: '2026-09-22T00:00:00Z' }),
      set('open', { due_at: null }),
    ],
    member(AMIRA),
    NOW
  )
  const by = new Map(rows.map((r) => [r.id, r]))
  assert.equal(by.get('rv')?.outcome, 'complete')
  assert.equal(by.get('rv')?.cells[0].state, 'reviewed')
  assert.equal(by.get('closed')?.outcome, 'missing')
  assert.equal(by.get('open')?.outcome, 'to_do')
}

{
  // Someone who has left: sets published before they went are still theirs, shown as left.
  const gone = member(AMIRA, { status: 'left', left_at: '2026-09-15T00:00:00Z' })
  const rows = buildStudentSetRecord([set('s')], gone, NOW)
  assert.equal(rows[0]?.outcome, 'left')
}

// --- the roster's latest set ---------------------------------------------------------------

{
  const sets = [
    set('older', { published_at: '2026-09-01T09:00:00Z' }),
    set('newest', { published_at: '2026-09-20T09:00:00Z' }),
    set('archived', { published_at: '2026-09-24T09:00:00Z', archived_at: '2026-09-24T10:00:00Z' }),
    set('draft', { published_at: null }),
  ]
  assert.equal(pickLatestSet(sets)?.id, 'newest', 'latest published, not archived, not a draft')
  assert.equal(pickLatestSet([]), null)
}

{
  const s = set('latest', {
    submissions: [
      sub('latest', 0, AMIRA, '2026-09-19T10:00:00Z', 5),
      sub('latest', 1, AMIRA, '2026-09-19T10:00:00Z', 2.5),
      sub('latest', 0, BEN, '2026-09-19T10:00:00Z', 1),
    ],
  })
  const cells = latestSetByStudent(s, [member(AMIRA), member(BEN), member(CARA, { joined_at: '2026-09-22T00:00:00Z' })], NOW)
  assert.deepEqual(cells.get(AMIRA), { outcome: 'complete', detail: '7.5/10', overall_pct: 75 })
  assert.deepEqual(cells.get(BEN), { outcome: 'partial', detail: '1 of 2 in', overall_pct: 20 })
  assert.equal(cells.get(CARA)?.outcome, 'before_joining', 'joined after the deadline')
  assert.equal(cells.get(CARA)?.detail, '')
}

console.log('lib/teacher/insights/student-record.test.ts — all assertions passed')
