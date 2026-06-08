import assert from 'node:assert/strict'
import {
  extractLatexFragments,
  katexConfidenceScore,
  summarizeKatexValidation,
  validateKatexFragment,
} from './katex-validate'

assert.equal(validateKatexFragment('x^2').parseable, true)
assert.equal(validateKatexFragment('\\frac{1}').parseable, false)

const good = summarizeKatexValidation('The value is $v_s = 2\\pi f$.')
assert.equal(good.allParseable, true)
assert.equal(katexConfidenceScore('The value is $v_s = 2\\pi f$.'), 1)

const badText = 'Bad $\\broken{cmd$ and good $x^2$'
const bad = summarizeKatexValidation(badText)
assert.equal(bad.allParseable, false)
assert.ok(bad.failedFragments.length > 0)
assert.ok(katexConfidenceScore(badText) < 1)

const frags = extractLatexFragments('Inline $a$ and display $$b^2$$')
assert.equal(frags.length, 2)

console.log('katex-validate.test.ts: ok')
