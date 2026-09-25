import assert from 'node:assert/strict'
import { allowanceRefusedNote } from '@/lib/billing/question-copy'

// Nothing refused → nothing to say. The common case must render nothing.
assert.equal(allowanceRefusedNote(undefined), null)
assert.equal(allowanceRefusedNote(null), null)
assert.equal(allowanceRefusedNote({ marks_charged: 3, marks_refused: 0 }), null)
assert.equal(allowanceRefusedNote({ marks_charged: 1 }), null)

// A 3-question script with one mark left: charged 1, refused 2.
const one = allowanceRefusedNote({ marks_charged: 1, marks_refused: 2 })
assert.ok(one)
assert.match(one, /3 questions/)
assert.match(one, /only 1 mark was left/)
assert.match(one, /every question is marked/i)

// Plural agreement when more than one mark was charged.
const two = allowanceRefusedNote({ marks_charged: 2, marks_refused: 1 })
assert.ok(two)
assert.match(two, /3 questions/)
assert.match(two, /only 2 marks were left/)

// Defensive: a missing marks_charged still counts the reserved mark.
const noCharged = allowanceRefusedNote({ marks_refused: 1 })
assert.ok(noCharged)
assert.match(noCharged, /2 questions/)

// Garbage in → no note, never a throw (the block comes off the wire).
assert.equal(allowanceRefusedNote({ marks_refused: Number.NaN }), null)
assert.equal(allowanceRefusedNote({ marks_refused: -4 }), null)
assert.equal(allowanceRefusedNote({ questions_not_marked: Number.NaN }), null)
assert.equal(allowanceRefusedNote({ questions_not_marked: -1 }), null)
assert.equal(allowanceRefusedNote({ marks_charged: 2, questions_not_marked: 0 }), null)

// The script was CUT to the allowance before marking: the note must not claim
// every question was marked. A free user at 4/5 uploading 15 questions gets
// 2 marked and is told 13 are waiting.
const cut = allowanceRefusedNote({ marks_charged: 2, questions_not_marked: 13 })
assert.ok(cut)
assert.match(cut, /15 questions/)
assert.match(cut, /only 2 marks were left/)
assert.match(cut, /first 2 were marked/)
assert.match(cut, /other 13 were not/)
assert.doesNotMatch(cut, /every question is marked/i)

// Singular agreement on both sides.
const cutOne = allowanceRefusedNote({ marks_charged: 1, questions_not_marked: 1 })
assert.ok(cutOne)
assert.match(cutOne, /2 questions/)
assert.match(cutOne, /only 1 mark was left/)
assert.match(cutOne, /first 1 was marked/)
assert.match(cutOne, /other 1 was not/)
assert.match(cutOne, /upload it again/)

// When both are present the cut is the story: the refused backstop only
// applies to questions that were marked, and these were not.
const both = allowanceRefusedNote({ marks_charged: 1, marks_refused: 1, questions_not_marked: 2 })
assert.ok(both)
assert.match(both, /other 2 were not/)

console.log('question-copy tests passed')
