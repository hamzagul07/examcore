import assert from 'node:assert/strict'
import { splitQuestionBudget } from './split-question-budget'

// The bug: a free user at 4/5 uploads a 15-question script. Only the ledger
// was capped; all 15 were marked. Now the allowance (1 reserved + 1 left)
// bounds the marking itself.
assert.deepEqual(splitQuestionBudget({ detected: 15, hardCap: 15, maxQuestions: 2 }), {
  marked: 2,
  sizeCut: 0,
  allowanceCut: 13,
})

// Under the allowance: everything is marked and nothing is reported as cut.
assert.deepEqual(splitQuestionBudget({ detected: 3, hardCap: 15, maxQuestions: 10 }), {
  marked: 3,
  sizeCut: 0,
  allowanceCut: 0,
})

// No allowance bound (guest, warn/off mode): only the hard cap applies, and
// the cut is attributed to size, not to the allowance.
assert.deepEqual(splitQuestionBudget({ detected: 20, hardCap: 15, maxQuestions: null }), {
  marked: 15,
  sizeCut: 5,
  allowanceCut: 0,
})
assert.deepEqual(splitQuestionBudget({ detected: 5, hardCap: 3, maxQuestions: undefined }), {
  marked: 3,
  sizeCut: 2,
  allowanceCut: 0,
})

// Both bounds bite: the size cut is what the hard cap would drop regardless;
// the allowance cut is what remains between the hard cap and the allowance.
assert.deepEqual(splitQuestionBudget({ detected: 20, hardCap: 15, maxQuestions: 4 }), {
  marked: 4,
  sizeCut: 5,
  allowanceCut: 11,
})

// The reservation already paid for one question, so the allowance never cuts
// below one — a zero or negative bound still marks the first question.
assert.deepEqual(splitQuestionBudget({ detected: 4, hardCap: 15, maxQuestions: 0 }), {
  marked: 1,
  sizeCut: 0,
  allowanceCut: 3,
})
assert.deepEqual(splitQuestionBudget({ detected: 4, hardCap: 15, maxQuestions: -2 }), {
  marked: 1,
  sizeCut: 0,
  allowanceCut: 3,
})

// Garbage in never marks more than detected or throws.
assert.deepEqual(splitQuestionBudget({ detected: 2, hardCap: 15, maxQuestions: Number.NaN }), {
  marked: 2,
  sizeCut: 0,
  allowanceCut: 0,
})
assert.deepEqual(splitQuestionBudget({ detected: 0, hardCap: 15, maxQuestions: 3 }), {
  marked: 0,
  sizeCut: 0,
  allowanceCut: 0,
})
assert.deepEqual(splitQuestionBudget({ detected: 2.9, hardCap: 15, maxQuestions: 1.9 }), {
  marked: 1,
  sizeCut: 0,
  allowanceCut: 1,
})

console.log('split-question-budget: ok')
