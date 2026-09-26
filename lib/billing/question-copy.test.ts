import assert from 'node:assert/strict'
import {
  allowanceRefusedNote,
  questionPoolLabel,
  questionUsageMessage,
  type BillingSummaryClient,
} from '@/lib/billing/question-copy'

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

// --- Class bonus in the usage copy (spec §7) ---------------------------------
const summaryWith = (over: Partial<BillingSummaryClient['questions']>, tier: BillingSummaryClient['tier'] = 'free'): BillingSummaryClient => ({
  signedIn: true,
  tier,
  access: 'free',
  status: 'active',
  credit_balance: 0,
  period_resets_at: null,
  enforcement_mode: 'enforce',
  questions: { used: 0, cap: 5, remaining: 5, warning: false, blocked: false, ...over },
  omni: { used: 0, cap: 10, remaining: 10, warning: false, blocked: false },
})
// No bonus: unchanged wording.
assert.equal(questionPoolLabel(summaryWith({})), '5 free questions')
assert.equal(questionPoolLabel(summaryWith({ cap: 300 }, 'scholar')), '300 monthly questions')
// A free student in a verified teacher's class: the 25 is explained.
assert.equal(
  questionPoolLabel(summaryWith({ cap: 25, class_bonus: 20 })),
  '25 questions (5 free + 20 from your class)'
)
assert.equal(
  questionPoolLabel(summaryWith({ cap: 320, class_bonus: 20 }, 'scholar')),
  '320 questions (300 monthly + 20 from your class)'
)
// Garbage or an older API never shows a bonus; a bonus that is the whole cap is not split.
assert.equal(questionPoolLabel(summaryWith({ cap: 5, class_bonus: -2 })), '5 free questions')
assert.equal(questionPoolLabel(summaryWith({ cap: 20, class_bonus: 20 })), '20 free questions')
{
  const m = questionUsageMessage(summaryWith({ cap: 25, used: 3, remaining: 22, class_bonus: 20 }))
  assert.match(m.text, /1 of your 25 questions \(5 free \+ 20 from your class\)/)
  assert.equal(m.disableSubmit, false)
  const blocked = questionUsageMessage(summaryWith({ cap: 25, used: 25, remaining: 0, blocked: true, class_bonus: 20 }))
  assert.match(blocked.text, /all your 25 questions \(5 free \+ 20 from your class\)/)
  assert.equal(blocked.disableSubmit, true)
}

console.log('question-copy tests passed')
