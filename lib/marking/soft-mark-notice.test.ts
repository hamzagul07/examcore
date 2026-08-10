import assert from 'node:assert/strict'
import {
  SOFT_MARK_RETRY_NOTICE,
  SOFT_TOTAL_MARKS_NOTICE,
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
assert.ok(isTotalMarksClientMessage('could not read the total marks from your question'))

console.log('soft-mark-notice: all assertions passed')
