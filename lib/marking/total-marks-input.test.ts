import assert from 'node:assert/strict'
import {
  MAX_TOTAL_MARKS,
  isValidTotalMarks,
  parseTotalMarksInput,
} from './total-marks-input'

assert.equal(parseTotalMarksInput('7'), 7)
assert.equal(parseTotalMarksInput(' 12 '), 12)
assert.equal(parseTotalMarksInput('7.0'), 7)
assert.equal(parseTotalMarksInput(''), null)
assert.equal(parseTotalMarksInput('   '), null)
assert.equal(parseTotalMarksInput('0'), null)
assert.equal(parseTotalMarksInput('-3'), null)
assert.equal(parseTotalMarksInput('abc'), null)
assert.equal(parseTotalMarksInput(String(MAX_TOTAL_MARKS + 1)), null)
assert.equal(parseTotalMarksInput(String(MAX_TOTAL_MARKS)), MAX_TOTAL_MARKS)
assert.equal(parseTotalMarksInput(null), null)

assert.equal(isValidTotalMarks(5), true)
assert.equal(isValidTotalMarks(0), false)
assert.equal(isValidTotalMarks(NaN), false)
assert.equal(isValidTotalMarks('5'), false)
assert.equal(isValidTotalMarks(null), false)

console.log('total-marks-input: ok')
