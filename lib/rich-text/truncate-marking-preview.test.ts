import assert from 'node:assert/strict'
import { truncateMarkingPreview } from './truncate-marking-preview'

assert.equal(truncateMarkingPreview(''), 'Marked submission')
assert.equal(truncateMarkingPreview('Short stem'), 'Short stem')

const longPlain =
  'Find the coordinates of the stationary points on the curve y = x cubed minus six x plus four and determine their nature carefully.'
const plain = truncateMarkingPreview(longPlain, 80)
assert.ok(plain.endsWith('…'), plain)
assert.ok(plain.length <= 81, plain)
assert.ok(!plain.includes('nature carefully'), plain)

const midInline =
  'Differentiate $f\'(x)=\\mathrm{e}^{2x}(2\\sin x+\\cos x)$ and hence find the exact value of the gradient when x equals pi over four in radians.'
const inline = truncateMarkingPreview(midInline, 28)
assert.equal(inline, 'Differentiate…')
assert.ok(!inline.includes('$'), inline)

const midBlock =
  'Evaluate $$\\int_0^{\\pi/2}\\sin x\\,dx$$ showing every step of your working clearly for full marks.'
const block = truncateMarkingPreview(midBlock, 24)
assert.equal(block, 'Evaluate…')
assert.ok(!block.includes('$'), block)

const completeMath = truncateMarkingPreview('Use $x^2$ then expand carefully with binomial theorem steps.', 40)
assert.ok(completeMath.includes('$x^2$'), completeMath)
assert.ok(completeMath.endsWith('…'), completeMath)

console.log('truncate-marking-preview.test.ts: ok')
