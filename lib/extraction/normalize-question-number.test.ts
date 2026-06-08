import assert from 'node:assert/strict'
import { normalizeQuestionNumber } from './normalize-question-number'

assert.equal(normalizeQuestionNumber('4(b)(ii)'), '4(b)(ii)')
assert.equal(normalizeQuestionNumber('4 (b) (ii)'), '4(b)(ii)')
assert.equal(normalizeQuestionNumber('Q4(b)(ii)'), '4(b)(ii)')
assert.equal(normalizeQuestionNumber('4(b) (ii)'), '4(b)(ii)')
assert.equal(normalizeQuestionNumber('  1(a)(i)  '), '1(a)(i)')

console.log('normalize-question-number tests OK')
