import assert from 'node:assert/strict'
import {
  resolveRequiredQuestionTotal,
  questionTotalPromiseIsBroken,
  type QuestionTotalPromiseInput,
} from './require-question-total'

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.equal(out.ok, false)
  if (!out.ok) {
    assert.match(out.message, /Enter the total marks/)
  }
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
    marksInQuestion: true,
  })
  assert.equal(out.ok, false)
  if (!out.ok) {
    assert.match(out.message, /could not read the total marks/i)
  }
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: 18,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.deepEqual(out, { ok: true, total: 18 })
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: 9,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.deepEqual(out, { ok: true, total: 9 })
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: true,
    hasIbCatalogTotal: false,
  })
  assert.equal(out.ok, true, 'banked scheme skips the gate')
}

// ── "The marks are shown in the question" — checked before the wait ────────
//
// 12 of the 13 recorded missing-total failures had this box ticked against a
// question with no marks in it, and the student waited up to 184 seconds to be
// told. The predicate below is what lets the form say it immediately.
//
// It is one-directional on purpose: true means CERTAINLY broken. Anything we
// have not read yet — a question photo, an upload that may carry the printed
// stem — must return false, because the number may well be in there.

const base: QuestionTotalPromiseInput = {
  marksInQuestion: true,
  questionText: 'Explain why water is a polar molecule.',
  hasQuestionImage: false,
  mayRecoverQuestionFromUpload: false,
  questionMarks: null,
  hasSchemeTotal: false,
}

assert.equal(
  questionTotalPromiseIsBroken(base),
  true,
  'a typed question with no marks in it cannot keep the promise'
)

assert.equal(
  questionTotalPromiseIsBroken({ ...base, marksInQuestion: false }),
  false,
  'nothing was promised'
)

// Any of these could still supply the number.
assert.equal(
  questionTotalPromiseIsBroken({ ...base, hasQuestionImage: true }),
  false,
  'a question photo has not been read yet'
)
assert.equal(
  questionTotalPromiseIsBroken({ ...base, mayRecoverQuestionFromUpload: true }),
  false,
  'the upload may carry the printed stem'
)
assert.equal(
  questionTotalPromiseIsBroken({ ...base, questionMarks: 18 }),
  false,
  'the student typed a total, so the tick is moot'
)
assert.equal(
  questionTotalPromiseIsBroken({ ...base, hasSchemeTotal: true }),
  false,
  'a banked or IB catalog total settles the denominator'
)
assert.equal(
  questionTotalPromiseIsBroken({ ...base, questionMarks: 0 }),
  true,
  'zero is not a total'
)

// A question with a readable total keeps the promise, in each form the
// extractor understands.
for (const text of [
  'Explain why water is a polar molecule. [4]',
  'Discuss the causes of the war. (Total 25 marks)',
  'Describe the process. [Maximum mark: 8]',
]) {
  assert.equal(
    questionTotalPromiseIsBroken({ ...base, questionText: text }),
    false,
    `promise kept: ${text}`
  )
}

// No question at all is a different failure with its own message — this
// predicate must not claim it.
for (const empty of ['', '   ', null, undefined]) {
  assert.equal(
    questionTotalPromiseIsBroken({ ...base, questionText: empty }),
    false,
    'a missing question is not a broken marks promise'
  )
}

console.log('require-question-total: all assertions passed')
