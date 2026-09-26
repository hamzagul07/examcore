import assert from 'node:assert/strict'
import { deriveStudentState, summariseProgress } from '@/lib/teacher/assignment-status'
import type {
  AssignmentItem,
  AssignmentStudentFlags,
  AssignmentSubmission,
  MembershipStatus,
  StudentAssignmentState,
} from '@/lib/teacher/types'
import {
  CELL_GLYPH,
  MATRIX_STATES,
  buildMatrix,
  cellClassName,
  formatMark,
  formatMarks,
  matrixCell,
  matrixColumns,
  matrixRow,
  rowStatus,
  shortSession,
} from '@/components/teacher/assignments/matrix-cells'

const CLASS = '11111111-1111-4111-8111-111111111111'
const SET = '22222222-2222-4222-8222-222222222222'
const ATTEMPT = '33333333-3333-4333-8333-333333333333'

// --- marks --------------------------------------------------------------------

assert.equal(formatMark(7), '7')
assert.equal(formatMark(7.5), '7.5')
assert.equal(formatMark(6.999999), '7')
assert.equal(formatMarks(7, 9), '7/9')
assert.equal(formatMarks(0, 9), '0/9', 'zero is a mark, not a blank')
assert.equal(formatMarks(7, null), '7', 'an unknown total shows the mark alone')
assert.equal(formatMarks(7, 0), '7', 'a zero total is unusable')
assert.equal(formatMarks(null, 9), '')
assert.equal(formatMarks(Number.NaN, 9), '')

// --- the six states: glyph, modifier, sentence, link ----------------------------

assert.deepEqual([...MATRIX_STATES], ['done', 'late', 'reviewed', 'missing', 'excused', 'left'])
for (const state of MATRIX_STATES) {
  assert.equal(cellClassName(state), `ms-set-matrix__cell ms-set-matrix__cell--${state}`)
}

const column = { title: 'Question 3, 9709/12 May/June 2024, 9 marks' }
const cell = (state: StudentAssignmentState['items'][number]['state'], extra: Partial<StudentAssignmentState['items'][number]> = {}) =>
  matrixCell(
    { item_id: 'i1', state, marks_earned: null, total_marks: 9, attempt_id: null, ...extra },
    { studentName: 'Amira K.', column }
  )

const done = cell('done', { marks_earned: 7, attempt_id: ATTEMPT })
assert.equal(done.text, '✓ 7/9')
assert.equal(done.className, 'ms-set-matrix__cell ms-set-matrix__cell--done')
assert.equal(done.href, `/teacher/reviews/${ATTEMPT}`)
assert.equal(
  done.label,
  'Amira K., Question 3, 9709/12 May/June 2024, 9 marks: handed in, 7 out of 9 marks. Open the script'
)

const late = cell('late', { marks_earned: 4, attempt_id: ATTEMPT })
assert.equal(late.text, 'L 4/9')
assert.match(late.label, /handed in late, 4 out of 9 marks/)

const reviewed = cell('reviewed', { marks_earned: 7, attempt_id: ATTEMPT })
assert.equal(reviewed.text, 'RV 7/9')
assert.match(reviewed.label, /reviewed by you/)

const missing = cell('missing')
assert.equal(missing.text, '—')
assert.equal(missing.href, null, 'nothing to open')
assert.match(missing.label, /not handed in yet$/)

const excused = cell('excused')
assert.equal(excused.text, 'EXC')
assert.equal(excused.href, null)

const left = cell('left')
assert.equal(left.text, 'LEFT')
assert.match(left.label, /left the class/)

// A hand-in without a script behind it (a retained row whose attempt was deleted) does not link.
assert.equal(cell('done', { marks_earned: 5 }).href, null)
// Marks never show on a cell that is not a hand-in, even if a caller passes them.
assert.equal(cell('missing', { marks_earned: 3 }).text, '—')
// Not marked yet: glyph alone.
assert.equal(cell('done', { attempt_id: ATTEMPT }).text, '✓')
assert.match(cell('done', { attempt_id: ATTEMPT }).label, /handed in, not marked yet/)
assert.equal(CELL_GLYPH.reviewed, 'RV')

// --- columns --------------------------------------------------------------------

const item = (id: string, position: number, over: Partial<AssignmentItem>): AssignmentItem => ({
  id,
  assignment_id: SET,
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: 'ms',
  paper_code: '9709/12',
  paper_session: 'May/June 2024',
  question_number: '3',
  total_marks: 9,
  syllabus_tags: null,
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
  ...over,
})

const ITEMS: AssignmentItem[] = [
  item('p2', 3, { item_type: 'prompt', paper_code: null, paper_session: null, question_number: null, total_marks: null, prompt_text: 'Explain' }),
  item('q3', 0, {}),
  item('wp', 2, { item_type: 'whole_paper', question_number: null, paper_session: 'October/November 2023', total_marks: 75 }),
  item('q5', 1, { question_number: '5', total_marks: 1 }),
]

assert.equal(shortSession('May/June 2024'), 'Jun 24')
assert.equal(shortSession('October/November 2023'), 'Nov 23')
assert.equal(shortSession('February/March 2025'), 'Mar 25')
assert.equal(shortSession('Specimen'), 'Specimen', 'unknown sessions pass through')
assert.equal(shortSession(null), '')

const cols = matrixColumns(ITEMS)
assert.deepEqual(
  cols.map((c) => c.item_id),
  ['q3', 'q5', 'wp', 'p2'],
  'columns follow item position'
)
assert.deepEqual(
  cols.map((c) => [c.label, c.sub]),
  [
    ['Q3', '9709/12 · Jun 24'],
    ['Q5', '9709/12 · Jun 24'],
    ['9709/12', 'Nov 23'],
    ['Prompt 1', ''],
  ]
)
assert.equal(cols[0].title, 'Question 3, 9709/12 May/June 2024, 9 marks')
assert.equal(cols[1].title, 'Question 5, 9709/12 May/June 2024, 1 mark')
assert.equal(cols[2].title, 'Whole paper 9709/12 October/November 2023, 75 marks')
assert.equal(cols[3].title, 'Prompt 1')

// --- rows from real P0 state derivation ------------------------------------------

const DUE = '2026-10-02T15:00:00.000Z'
const sub = (item_id: string, student_id: string, at: string, earned: number, status: AssignmentSubmission['status'] = 'submitted'): AssignmentSubmission => ({
  id: `${item_id}-${student_id}`,
  assignment_id: SET,
  item_id,
  student_id,
  attempt_id: ATTEMPT,
  attempt_count: 1,
  marks_earned: earned,
  total_marks: null,
  status,
  source: 'linked',
  first_submitted_at: at,
  last_submitted_at: at,
})
const flags = (student_id: string, over: Partial<AssignmentStudentFlags>): AssignmentStudentFlags => ({
  assignment_id: SET,
  student_id,
  excused_at: null,
  extended_due_at: null,
  feedback: null,
  feedback_at: null,
  reminded_at: null,
  ...over,
})
const state = (
  student_id: string,
  display_name: string,
  membership: MembershipStatus,
  submissions: AssignmentSubmission[],
  f: AssignmentStudentFlags | null = null
): StudentAssignmentState => ({
  student_id,
  display_name,
  ...deriveStudentState({ membership, items: ITEMS, submissions, flags: f, due_at: DUE }),
})

const onTime = '2026-10-01T10:00:00.000Z'
const afterDue = '2026-10-03T10:00:00.000Z'
const STATES: StudentAssignmentState[] = [
  state('amira', 'Amira K.', 'active', [
    sub('q3', 'amira', onTime, 7),
    sub('q5', 'amira', onTime, 1, 'reviewed'),
    sub('wp', 'amira', onTime, 60),
    sub('p2', 'amira', onTime, 4),
  ]),
  state('ben', 'Ben O.', 'active', [sub('q3', 'ben', afterDue, 4)]),
  state('cara', 'Cara L.', 'left', [sub('q3', 'cara', onTime, 9)]),
  state('dev', 'Dev P.', 'active', [], flags('dev', { excused_at: onTime })),
  state('eli', 'Eli R.', 'active', [], flags('eli', { extended_due_at: '2026-10-09T15:00:00.000Z' })),
]

const amira = matrixRow(STATES[0], cols, { classroomId: CLASS })
assert.deepEqual(
  amira.cells.map((c) => c.text),
  ['✓ 7/9', 'RV 1/1', '✓ 60/75', '✓ 4'],
  'prompt without a total shows the mark alone'
)
assert.equal(amira.status, 'complete')
assert.equal(amira.href, `/teacher/classroom/${CLASS}/students/amira`)
assert.deepEqual(amira.chips, [])

const ben = matrixRow(STATES[1], cols, { classroomId: CLASS })
assert.deepEqual(
  ben.cells.map((c) => c.state),
  ['late', 'missing', 'missing', 'missing']
)
assert.equal(ben.status, 'partial')
assert.equal(ben.late, true)
assert.equal(ben.overall, '44%')

const cara = matrixRow(STATES[2], cols, { classroomId: CLASS })
assert.deepEqual(
  cara.cells.map((c) => c.state),
  ['done', 'left', 'left', 'left'],
  'work handed in before leaving is kept'
)
assert.equal(cara.status, 'left')
assert.equal(cara.href, null, 'no link to a departed student')
assert.deepEqual(
  cara.chips.map((c) => c.text),
  ['LEFT']
)

const dev = matrixRow(STATES[3], cols, { classroomId: CLASS })
assert.deepEqual(new Set(dev.cells.map((c) => c.state)), new Set(['excused']))
assert.equal(dev.status, 'excused')
assert.equal(dev.overall, '—', 'no marks is a dash, not 0%')
assert.deepEqual(
  dev.chips.map((c) => c.text),
  ['EXC']
)

const eli = matrixRow(STATES[4], cols, { classroomId: CLASS })
assert.equal(eli.status, 'none')
assert.deepEqual(
  eli.chips.map((c) => c.text),
  ['EXT']
)

assert.equal(rowStatus({ ...STATES[4], items: [] }), 'none', 'a set with no items has nothing handed in')

// A student whose state lacks a column (an item added to a draft after states were built) reads as missing.
const short = matrixRow({ ...STATES[4], items: STATES[4].items.slice(0, 1) }, cols, { classroomId: CLASS })
assert.deepEqual(
  short.cells.map((c) => c.state),
  ['missing', 'missing', 'missing', 'missing']
)

// --- the whole matrix -------------------------------------------------------------

const progress = { students: STATES, ...summariseProgress(STATES, ITEMS) }
const matrix = buildMatrix(progress, ITEMS, { classroomId: CLASS })
assert.deepEqual(
  matrix.rows.map((r) => r.student_id),
  ['amira', 'ben', 'dev', 'eli', 'cara'],
  'students still in the class first'
)
assert.equal(matrix.columns.length, 4)
assert.deepEqual(matrix.means, ['74%', '100%', '80%', '—'], 'means count work kept from a student who left; a prompt without a total has none')
assert.equal(matrix.anyHandedIn, 3)
assert.match(matrix.classMean, /^\d+%$/)

// Every one of the six states appears somewhere in this fixture.
const seen = new Set(matrix.rows.flatMap((r) => r.cells.map((c) => c.state)))
for (const s of MATRIX_STATES) assert.ok(seen.has(s), `fixture renders ${s}`)

const empty = buildMatrix({ students: [], per_item: [], class_mean_pct: null }, [], { classroomId: CLASS })
assert.deepEqual(empty, { columns: [], rows: [], means: [], classMean: '—', anyHandedIn: 0 })

console.log('matrix-cells.test.ts — all assertions passed')
