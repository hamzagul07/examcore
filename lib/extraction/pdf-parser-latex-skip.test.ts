import assert from 'node:assert/strict'
import {
  HIGH_CONFIDENCE_LATEX_SKIP_THRESHOLD,
  shouldSkipFlashLatexValidation,
} from './pdf-parser'
import { katexConfidenceScore, summarizeKatexValidation } from './katex-validate'

const goodText = 'The speed is $v_s = 2\\pi f$ and energy $E = mc^2$.'
const katex = summarizeKatexValidation(goodText)
const score = katexConfidenceScore(goodText)

assert.equal(katex.allParseable, true)
assert.ok(score >= HIGH_CONFIDENCE_LATEX_SKIP_THRESHOLD)
assert.equal(shouldSkipFlashLatexValidation(katex, score, false), true)
assert.equal(shouldSkipFlashLatexValidation(katex, score, true), false)

const bad = summarizeKatexValidation('Broken $\\bad{cmd$')
assert.equal(shouldSkipFlashLatexValidation(bad, 0.5, false), false)

console.log('pdf-parser-latex-skip.test.ts: ok')
