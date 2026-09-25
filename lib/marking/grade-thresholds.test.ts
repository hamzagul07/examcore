import assert from 'node:assert/strict'
import {
  CAMBRIDGE_GRADE_NOTE,
  DEFAULT_GRADE_THRESHOLDS,
  GENERIC_GRADE_NOTE,
  GRADE_THRESHOLDS,
  NO_GRADE_NOTE,
  estimateGrade,
} from './grade-thresholds'

// --- the table is ordered: A* strictly above A, and every step descends ------
//
// The old table had no A* row; the code read its A value as the A* boundary
// and gave an A to anyone four points under it.

const ordered = (t: { A_STAR: number; A: number; B: number; C: number; D: number; E: number }) =>
  t.A_STAR > t.A && t.A > t.B && t.B > t.C && t.C > t.D && t.D > t.E && t.E > 0

assert.ok(ordered(DEFAULT_GRADE_THRESHOLDS), 'default table descends')
for (const [subject, components] of Object.entries(GRADE_THRESHOLDS)) {
  for (const [component, table] of Object.entries(components)) {
    assert.ok(ordered(table), `${subject}/${component} descends A* > A > … > E`)
  }
}

// --- Cambridge: the real A threshold is an A, not an A* ----------------------

const maths = GRADE_THRESHOLDS['9709'].default
assert.equal(estimateGrade('9709', '12', maths.A).grade, 'A', 'exactly the A boundary is an A')
assert.equal(estimateGrade('9709', '12', maths.A_STAR).grade, 'A*')
assert.equal(estimateGrade('9709', '12', maths.A - 1).grade, 'B', 'one under A is a B')
assert.equal(estimateGrade('9709', '12', maths.E - 1).grade, 'U')
assert.equal(estimateGrade('9709', '12', 100).grade, 'A*')
assert.equal(estimateGrade('9709', '12', 0).grade, 'U')
assert.equal(estimateGrade('9709', '12', 90).note, CAMBRIDGE_GRADE_NOTE)

// component-specific table wins over the subject default
assert.equal(
  estimateGrade('9702', '11', GRADE_THRESHOLDS['9702']['11'].A).grade,
  'A',
  'MCQ paper uses its own boundaries'
)
assert.equal(
  estimateGrade('9702', '42', GRADE_THRESHOLDS['9702'].default.A).grade,
  'A',
  'unknown component falls back to the subject default'
)

// unknown Cambridge subject falls back to the generic table, Cambridge note kept
assert.equal(estimateGrade('9999', '12', DEFAULT_GRADE_THRESHOLDS.A).grade, 'A')
assert.equal(estimateGrade('9999', '12', 80).note, CAMBRIDGE_GRADE_NOTE)

// --- other boards ------------------------------------------------------------

const edexcel = estimateGrade('WMA11', '01', DEFAULT_GRADE_THRESHOLDS.A)
assert.equal(edexcel.grade, 'A', 'Edexcel IAL is letter-graded')
assert.equal(edexcel.note, GENERIC_GRADE_NOTE, 'a non-Cambridge paper gets a board-neutral note')

const ib = estimateGrade('biology-hl', 'Paper 1', 90)
assert.equal(ib.grade, '', 'IB is graded 1–7; a letter would be invented')
assert.equal(ib.note, NO_GRADE_NOTE)

console.log('grade-thresholds: all assertions passed')
