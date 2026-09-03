import assert from 'node:assert/strict'
import {
  isUsableStarter,
  starterSubject,
  pickStarter,
  toStarterQuestion,
  STARTER_FALLBACK_SUBJECT,
  STARTER_MIN_MARKS,
  STARTER_MAX_MARKS,
  STARTER_MIN_QUESTION_CHARS,
  isWholeQuestionNumber,
} from './starter-question'

const good = {
  paper_code: '9709/12',
  paper_session: 'May/June 2025',
  question_number: '4',
  question_text:
    'The curve has equation y = 3x^2 - 12x + 7. Find the coordinates of the stationary point and determine its nature.',
  total_marks: 6,
}

// ── A starter must be answerable, and its scheme findable ───────────────────
assert.ok(isUsableStarter(good))

// The paper reference is what resolves the official scheme; without any part
// of it the mark falls back to deriving one, which is the slower, worse path.
for (const missing of ['paper_code', 'paper_session', 'question_number'] as const) {
  assert.equal(
    isUsableStarter({ ...good, [missing]: null }),
    false,
    `must reject a row with no ${missing}`
  )
  assert.equal(isUsableStarter({ ...good, [missing]: '   ' }), false)
}

// Without text there is no question on screen to answer.
assert.equal(isUsableStarter({ ...good, question_text: null }), false)
assert.equal(
  isUsableStarter({ ...good, question_text: 'Find x.' }),
  false,
  'a fragment is not a question'
)
assert.equal(
  isUsableStarter({ ...good, question_text: 'y'.repeat(STARTER_MIN_QUESTION_CHARS) }),
  true,
  'exactly at the floor is usable'
)

// The mark window keeps a starter to a couple of minutes' work.
assert.equal(isUsableStarter({ ...good, total_marks: STARTER_MIN_MARKS - 1 }), false)
assert.equal(isUsableStarter({ ...good, total_marks: STARTER_MAX_MARKS + 1 }), false)
assert.equal(isUsableStarter({ ...good, total_marks: STARTER_MIN_MARKS }), true)
assert.equal(isUsableStarter({ ...good, total_marks: STARTER_MAX_MARKS }), true)
assert.equal(isUsableStarter({ ...good, total_marks: null }), false)
assert.equal(isUsableStarter(null), false)
assert.equal(isUsableStarter(undefined), false)

// ── Only whole questions ───────────────────────────────────────────────────
// A part inherits its setup from a stem stored on another row, so handing one
// over alone gives the student something unanswerable. The bank is full of them:
// "test the factory owner's claim" reads fine and refers to a stem that is
// nowhere on screen. The question number is a structural signal that the text
// is not.
assert.ok(isWholeQuestionNumber('4'))
assert.ok(isWholeQuestionNumber('11'))
assert.ok(isWholeQuestionNumber(' 7 '))
for (const part of ['4(a)', '2(b)', '3(c)(ii)', '1a', '', null, undefined, '4 (a)', '100']) {
  assert.equal(isWholeQuestionNumber(part), false, `must reject ${JSON.stringify(part)}`)
}
assert.equal(isUsableStarter({ ...good, question_number: '4(a)' }), false)

// ── Subject choice ─────────────────────────────────────────────────────────
assert.equal(starterSubject('9702'), '9702')
assert.equal(starterSubject(' 9700 '), '9700')
assert.equal(starterSubject(null), STARTER_FALLBACK_SUBJECT)
assert.equal(starterSubject(''), STARTER_FALLBACK_SUBJECT)
// IB is marked against criteria and mark_schemes is 100% Cambridge, so an IB
// code must fall back rather than silently draw a question from another
// qualification.
assert.equal(starterSubject('ib-chemistry'), STARTER_FALLBACK_SUBJECT)
assert.equal(starterSubject('ib-chemistry-hl'), STARTER_FALLBACK_SUBJECT)
assert.equal(starterSubject('WMA11'), STARTER_FALLBACK_SUBJECT, 'Edexcel unit code')
assert.equal(starterSubject('97091'), STARTER_FALLBACK_SUBJECT, 'not four digits')

// ── Picking ────────────────────────────────────────────────────────────────
assert.equal(pickStarter([]), null)
assert.equal(pickStarter([{ ...good, question_text: null }]), null, 'all unusable')

// Unusable rows are skipped, not returned and not counted in the draw.
{
  const rows = [{ ...good, total_marks: 99 }, good]
  const picked = pickStarter(rows, () => 0)
  assert.ok(picked)
  assert.equal(picked!.questionNumber, '4')
  assert.equal(picked!.totalMarks, 6)
}

// The random index stays inside the array even at the boundary — Math.random()
// can return values that floor to length after scaling on some inputs.
{
  const rows = [good, { ...good, question_number: '5' }]
  assert.ok(pickStarter(rows, () => 0.999999999))
  assert.ok(pickStarter(rows, () => 1))
  assert.ok(pickStarter(rows, () => 0))
}

// ── Shape handed to the marker ─────────────────────────────────────────────
{
  const q = toStarterQuestion({ ...good, paper_code: ' 9709/12 ', question_number: ' 4 ' })
  assert.ok(q)
  assert.equal(q!.paperCode, '9709/12', 'trimmed — it is parsed as subject/component')
  assert.equal(q!.questionNumber, '4')
  assert.equal(q!.paperSession, 'May/June 2025')
  assert.equal(typeof q!.totalMarks, 'number')
}

console.log('starter-question: all assertions passed')
