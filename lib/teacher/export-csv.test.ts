import assert from 'node:assert/strict'
import {
  ASSIGNMENTS_HEADER,
  ATTEMPTS_HEADER,
  MAX_EXPORT_ROWS,
  buildAssignmentsCsv,
  buildAttemptsCsv,
  contentDisposition,
  csvCell,
  csvDate,
  csvFilename,
  csvSetFilename,
  exportStudentLabels,
  parseExportScope,
  setStatusLabel,
  slugForFilename,
  toCsv,
  type ExportAssignment,
  type ExportStudent,
} from '@/lib/teacher/export-csv'
import type { AssignmentItem, AssignmentSubmission } from '@/lib/teacher/types'

// --- cells: RFC 4180 quoting ---------------------------------------------------

assert.equal(csvCell('plain'), 'plain')
assert.equal(csvCell('a,b'), '"a,b"')
assert.equal(csvCell('say "hi"'), '"say ""hi"""')
assert.equal(csvCell('two\nlines'), '"two\nlines"')
assert.equal(csvCell(' padded '), '" padded "', 'edge spaces survive a round trip')
assert.equal(csvCell(null), '')
assert.equal(csvCell(undefined), '')
assert.equal(csvCell(7.5), '7.5')
assert.equal(csvCell(-3), '-3', 'a negative number is data, not a formula')
assert.equal(csvCell(Number.NaN), '')
assert.equal(csvCell(true), 'TRUE')

// --- cells: formula injection is neutralised ----------------------------------

// A student chooses their own name, and teachers open these files in Excel.
for (const payload of ['=HYPERLINK("http://evil","x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\r=1']) {
  const cell = csvCell(payload)
  const unquoted = cell.startsWith('"') ? cell.slice(1) : cell
  assert.ok(unquoted.startsWith("'"), `formula neutralised: ${JSON.stringify(payload)} → ${cell}`)
}
assert.equal(csvCell('=1+1'), "'=1+1")
assert.equal(csvCell('=A1,B1'), `"'=A1,B1"`, 'neutralised and quoted')

// --- files ----------------------------------------------------------------------

{
  const csv = toCsv(['Name', 'Score'], [
    ['Amira K.', 7],
    ['Ben, jr', null],
  ])
  assert.ok(csv.startsWith('\uFEFF'), 'BOM so Excel reads UTF-8')
  assert.equal(csv, '\uFEFFName,Score\r\nAmira K.,7\r\n"Ben, jr",\r\n', 'CRLF rows, trailing newline')
}

assert.equal(slugForFilename('Year 12 Chemistry!'), 'year-12-chemistry')
assert.equal(slugForFilename('Économie — 2ème'), 'economie-2eme')
assert.equal(slugForFilename('日本語'), 'class', 'never an empty filename')
assert.equal(slugForFilename('x'.repeat(100)).length, 60)

assert.equal(csvFilename('Y12 Maths', 'assignments', new Date('2026-09-25T12:00:00Z')), 'y12-maths-sets-2026-09-25.csv')
assert.equal(csvFilename('Y12 Maths', 'attempts', new Date('2026-09-25T12:00:00Z')), 'y12-maths-attempts-2026-09-25.csv')
// One set's markbook names the set; a title with nothing sluggable still gives a name.
assert.equal(
  csvSetFilename('Y12 Maths', 'Vectors — drill 2', new Date('2026-09-25T12:00:00Z')),
  'y12-maths-vectors-drill-2-2026-09-25.csv'
)
assert.equal(csvSetFilename('Y12 Maths', '——', new Date('2026-09-25T12:00:00Z')), 'y12-maths-set-2026-09-25.csv')
assert.equal(contentDisposition('a b"c.csv'), 'attachment; filename="a_b_c.csv"', 'header-safe filename')

assert.equal(csvDate('2026-09-25T16:00:00.000Z'), '2026-09-25 16:00')
assert.equal(csvDate('2026-09-25T17:00:00+01:00'), '2026-09-25 16:00', 'always UTC')
assert.equal(csvDate(null), '')
assert.equal(csvDate('nope'), '')

assert.equal(parseExportScope(null), 'assignments')
assert.equal(parseExportScope('attempts'), 'attempts')
assert.equal(parseExportScope('emails'), null)

// --- names: displayName only, duplicates numbered stably ------------------------

const students: ExportStudent[] = [
  { id: 's3', full_name: 'Amira Khan', joined_at: '2026-09-03T00:00:00Z' },
  { id: 's1', full_name: 'Amira Kaur', joined_at: '2026-09-01T00:00:00Z' },
  { id: 's2', full_name: 'Ben Lee', joined_at: '2026-09-02T00:00:00Z' },
  { id: 's4', full_name: null, joined_at: '2026-09-04T00:00:00Z' },
  { id: 's5', full_name: '=cmd|" /C calc"!A0 Evil', joined_at: '2026-09-05T00:00:00Z' },
]
{
  const labels = exportStudentLabels(students)
  assert.equal(labels.get('s1'), 'Amira K.', 'first to join keeps the plain label')
  assert.equal(labels.get('s3'), 'Amira K. (2)', 'later duplicate is numbered')
  assert.equal(labels.get('s2'), 'Ben L.')
  assert.equal(labels.get('s4'), 'Student', 'a missing name falls back')
  assert.equal(labels.get('s5'), 'Cmd E.', 'punctuation from a hostile name is gone before the CSV')
  for (const label of labels.values()) {
    assert.ok(!/@/.test(label), 'no email-shaped text ever reaches the file')
  }
  // Order of input does not change the numbering.
  const again = exportStudentLabels([...students].reverse())
  assert.deepEqual([...again.entries()].sort(), [...labels.entries()].sort())
}

// --- assignments scope --------------------------------------------------------------

const NOW = new Date('2026-09-25T12:00:00Z')
const set: ExportAssignment = {
  id: 'a1',
  title: 'Integration I',
  kind: 'question_set',
  is_mock: false,
  target: 'all',
  due_at: '2026-09-20T16:00:00Z',
  published_at: '2026-09-15T08:00:00Z',
  closed_at: null,
  archived_at: null,
}
const item = (id: string, position: number, total: number): AssignmentItem => ({
  id,
  assignment_id: 'a1',
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: `ms-${id}`,
  paper_code: '9709/12',
  paper_session: 'm/j/24',
  question_number: String(position + 1),
  total_marks: total,
  syllabus_tags: null,
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
})
const items = [item('i1', 0, 5), item('i2', 1, 4)]
const sub = (
  student: string,
  itemId: string,
  earned: number,
  total: number,
  at: string,
  status: AssignmentSubmission['status'] = 'submitted'
): AssignmentSubmission => ({
  id: `${student}-${itemId}`,
  assignment_id: 'a1',
  item_id: itemId,
  student_id: student,
  attempt_id: null,
  attempt_count: 1,
  marks_earned: earned,
  total_marks: total,
  status,
  source: 'linked',
  first_submitted_at: at,
  last_submitted_at: at,
})

{
  const { header, rows, truncated } = buildAssignmentsCsv({
    students: students.slice(0, 3),
    assignments: [
      set,
      { ...set, id: 'draft', title: 'Draft', published_at: null },
      { ...set, id: 'gone', title: 'Archived', archived_at: '2026-09-21T00:00:00Z' },
    ],
    items,
    submissions: [
      sub('s1', 'i1', 4, 5, '2026-09-19T10:00:00Z'),
      sub('s1', 'i2', 3, 4, '2026-09-19T11:00:00Z'),
      sub('s2', 'i1', 2, 5, '2026-09-22T10:00:00Z'),
    ],
    flags: [],
    now: NOW,
  })
  assert.deepEqual(header, ASSIGNMENTS_HEADER)
  assert.equal(truncated, false)
  assert.equal(rows.length, 3, 'one row per student on the one published, live set')
  const byName = new Map(rows.map((r) => [r[0], r]))
  const amira = byName.get('Amira K.')!
  assert.equal(amira[6], 'Handed in')
  assert.equal(amira[7], 2)
  assert.equal(amira[9], 7, 'marks summed over handed-in items')
  assert.equal(amira[10], 9)
  assert.equal(amira[11], 77.8)
  assert.equal(amira[12], '2026-09-19 10:00')
  assert.equal(amira[13], '2026-09-19 11:00')
  const ben = byName.get('Ben L.')!
  assert.equal(ben[6], 'Part done (late)', 'handed in after the deadline')
  const amira2 = byName.get('Amira K. (2)')!
  assert.equal(amira2[6], 'Missing', 'nothing handed in and the deadline has passed')
  assert.equal(amira2[9], null)
  assert.ok(
    rows.every((r) => !String(r[0]).includes('Khan') && !String(r[0]).includes('Kaur')),
    'no surnames in the file'
  )
}

{
  // Targeted set: only students with an assignment_students row appear;
  // excused and extensions come from those rows.
  const { rows } = buildAssignmentsCsv({
    students: students.slice(0, 3),
    assignments: [{ ...set, target: 'students' }],
    items,
    submissions: [],
    flags: [
      {
        assignment_id: 'a1',
        student_id: 's1',
        excused_at: '2026-09-18T00:00:00Z',
        extended_due_at: null,
        feedback: null,
        feedback_at: null,
        reminded_at: null,
      },
      {
        assignment_id: 'a1',
        student_id: 's2',
        excused_at: null,
        extended_due_at: '2026-09-30T16:00:00Z',
        feedback: null,
        feedback_at: null,
        reminded_at: null,
      },
    ],
    now: NOW,
  })
  assert.equal(rows.length, 2, 'untargeted students are left out')
  const byName = new Map(rows.map((r) => [r[0], r]))
  assert.equal(byName.get('Amira K.')![6], 'Excused')
  assert.equal(byName.get('Ben L.')![6], 'Not yet', 'an extension moves the deadline')
  assert.equal(byName.get('Ben L.')![5], '2026-09-30 16:00')
}

{
  // All items reviewed by the teacher.
  const label = setStatusLabel(
    {
      items: [
        { item_id: 'i1', state: 'reviewed', marks_earned: 1, total_marks: 1, attempt_id: null },
        { item_id: 'i2', state: 'reviewed', marks_earned: 1, total_marks: 1, attempt_id: null },
      ],
      excused: false,
      is_late: false,
      extended_due_at: null,
    },
    set.due_at,
    NOW
  )
  assert.equal(label, 'Reviewed')
  assert.equal(
    setStatusLabel({ items: [], excused: false, is_late: false, extended_due_at: null }, null, NOW),
    'Not yet',
    'no deadline, nothing handed in: not a problem yet'
  )
}

{
  // Row ceiling.
  const many: ExportStudent[] = Array.from({ length: MAX_EXPORT_ROWS + 5 }, (_, i) => ({
    id: `x${i}`,
    full_name: `Student ${i}`,
    joined_at: null,
  }))
  const { rows, truncated } = buildAssignmentsCsv({ students: many, assignments: [set], items, submissions: [], flags: [], now: NOW })
  assert.equal(rows.length, MAX_EXPORT_ROWS)
  assert.equal(truncated, true)
}

// --- attempts scope ---------------------------------------------------------------------

{
  const { header, rows } = buildAttemptsCsv({
    students: students.slice(0, 2),
    attempts: [
      {
        id: 't2',
        user_id: 's1',
        created_at: '2026-09-21T09:00:00Z',
        marks_earned: 3,
        total_marks: 4,
        time_spent_seconds: 390,
        assignment_item_id: 'i2',
        mark_schemes: [{ paper_code: '9709/12', paper_session: 'm/j/24', question_number: '2' }],
      },
      {
        id: 't1',
        user_id: 's1',
        created_at: '2026-09-20T09:00:00Z',
        marks_earned: 0,
        total_marks: 0,
        mark_schemes: null,
      },
      { id: 'x', user_id: 'stranger', created_at: '2026-09-20T09:00:00Z', marks_earned: 1, total_marks: 1 },
    ],
    setTitleByItem: new Map([['i2', 'Integration I']]),
  })
  assert.deepEqual(header, ATTEMPTS_HEADER)
  assert.equal(rows.length, 2, 'attempts of students not passed in are dropped')
  assert.deepEqual(rows[0], ['Amira K.', '2026-09-20 09:00', '', '', '', 0, 0, null, '', null], 'oldest first')
  assert.deepEqual(rows[1], ['Amira K.', '2026-09-21 09:00', '9709/12', 'm/j/24', '2', 3, 4, 75, 'Integration I', 6.5])
}

console.log('export-csv.test.ts — all assertions passed')
