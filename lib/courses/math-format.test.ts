import assert from 'node:assert/strict'
import {
  countUnescapedDollars,
  repairMathDelimiters,
  prepareCourseMathMarkdown,
} from './math-format'

assert.equal(countUnescapedDollars('$x$'), 2)
assert.equal(countUnescapedDollars('$x'), 1)

const fixed = repairMathDelimiters(
  'Gradient of Normal: $m_{\\text{normal}} = -\\frac{1}{m_{\\text{tangent}}}'
)
assert.equal(countUnescapedDollars(fixed), 2, 'closes unclosed delimiter')

const md = prepareCourseMathMarkdown('Q = mcΔT')
assert.ok(md.includes('$'), 'wraps unicode delta line')

console.log('math-format.test.ts: passed')
