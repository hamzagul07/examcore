import assert from 'node:assert/strict'
import { QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE } from './require-question-total'
import {
  SOFT_MARK_RETRY_NOTICE,
  SOFT_TOTAL_MARKS_NOTICE,
  SOFT_TOTAL_MARKS_NOT_FOUND_NOTICE,
  isTotalMarksClientMessage,
  softNoticeForMarkFailure,
} from './soft-mark-notice'

assert.equal(
  softNoticeForMarkFailure(
    'Enter the total marks for this question so we mark out of the right number.'
  ),
  SOFT_TOTAL_MARKS_NOTICE
)
assert.equal(
  softNoticeForMarkFailure('Gemini overloaded'),
  SOFT_MARK_RETRY_NOTICE
)
assert.ok(
  softNoticeForMarkFailure(
    "We couldn't read your handwriting. Try a clearer photo."
  ).includes('handwriting')
)
assert.equal(
  softNoticeForMarkFailure(
    'Add the mark total on each question (e.g. [6] on the stem), or mark one question at a time with the total entered.'
  ),
  'Add the mark total on each question (e.g. [6] on the stem), or mark one question at a time with the total entered.',
  'actionable API copy must surface, not the generic retry line'
)
assert.ok(isTotalMarksClientMessage('could not read the total marks from your question'))
// The pre-gate wording must be recognised as the same kind of message, or the
// student sees the generic "try again" notice for something retrying cannot fix.
assert.ok(isTotalMarksClientMessage(QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE))
assert.equal(
  softNoticeForMarkFailure(QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE),
  SOFT_TOTAL_MARKS_NOT_FOUND_NOTICE,
  'we looked and it was not there — do not re-offer the tick that just failed'
)

// The two total-marks notices must not be swapped. "We read your question and
// could not find it" follows a marker that actually looked; "add the total (or
// tick that they are shown)" is the nudge for someone who has given us neither.
// Offering the tick again after it has just failed is what produced four
// recorded retries that hit the identical error a second time.
assert.equal(
  softNoticeForMarkFailure(
    'We could not read the total marks from your question. Enter the total marks for this question (e.g. 18) and try again.'
  ),
  SOFT_TOTAL_MARKS_NOT_FOUND_NOTICE
)
assert.equal(
  softNoticeForMarkFailure(
    'Enter the total marks for this question so we mark out of the right number.'
  ),
  SOFT_TOTAL_MARKS_NOTICE
)
assert.notEqual(
  SOFT_TOTAL_MARKS_NOT_FOUND_NOTICE,
  SOFT_TOTAL_MARKS_NOTICE,
  'they are different situations and must read differently'
)
assert.ok(
  !/tick/i.test(SOFT_TOTAL_MARKS_NOT_FOUND_NOTICE),
  'never send them back to the tick box that just failed'
)

console.log('soft-mark-notice: all assertions passed')
