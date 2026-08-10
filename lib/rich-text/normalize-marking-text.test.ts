import assert from 'node:assert/strict'
import {
  normalizeMarkingText,
  isRealMath,
  prepareMarkingSnippet,
} from './normalize-marking-text'

assert.ok(isRealMath('\\theta'), 'theta is math')
assert.ok(isRealMath('\\sin x'), 'sin x is math')
assert.ok(isRealMath('x^2 = 4'), 'algebraic is math')
assert.ok(!isRealMath('152{,}000'), 'plain currency is not math')
assert.ok(!isRealMath('\\$40'), 'escaped dollar is not math')

const t1 = normalizeMarkingText('M1 for $\\theta$ in radians')
assert.ok(t1.includes('$\\theta$'), `theta preserved as math: ${t1}`)

const t2 = normalizeMarkingText('Result: \\[ x^2 + 2x \\]')
assert.ok(
  t2.includes('$$x^2 + 2x$$') || t2.includes('$$ x^2 + 2x $$'),
  `display math: ${t2}`
)

const t3 = normalizeMarkingText('A1 for \\(\\frac{dy}{dx} = 3x^2\\)')
assert.ok(t3.includes('\\frac{dy}{dx}'), `inline paren math: ${t3}`)

const t4 = normalizeMarkingText('Cost was $152{,}000$ total')
assert.ok(
  !/\$\d/.test(t4.replace(/\\\$/g, '')) || t4.includes('152,000'),
  `currency plain: ${t4}`
)

const t5 = normalizeMarkingText('$11{,}900 \\times \\$40 = \\$476{,}000$')
assert.ok(t5.includes('\\text{\\textdollar}'), `text-mode dollar: ${t5}`)

const t6 = normalizeMarkingText('a\x00b\x01c $x^2$')
assert.ok(
  !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(t6),
  `control chars stripped: ${JSON.stringify(t6)}`
)

const t7 = normalizeMarkingText('Award M1 for x^2 + 3x')
assert.ok(t7.includes('$') && t7.includes('x^2'), `bare math wrapped: ${t7}`)

const t8 = normalizeMarkingText('Product is $\\ce{H2O}$')
assert.ok(t8.includes('\\mathrm{H2O}'), `ce remapped: ${t8}`)
assert.ok(!t8.includes('\\ce{'), `ce removed: ${t8}`)

const t9 = normalizeMarkingText('Nested $\\ce{H2SO4^{+}}$')
assert.ok(t9.includes('\\mathrm{H2SO4^{+}}'), `nested ce: ${t9}`)

const t10 = normalizeMarkingText('Got $\\\\frac{1}{2}$')
assert.ok(t10.includes('\\frac{1}{2}'), `double-escape fixed: ${t10}`)
assert.ok(!t10.includes('\\\\frac'), `no double slash left: ${t10}`)

// Short bare math snippets still whole-wrap for KaTeX.
const snip = prepareMarkingSnippet('= 240x^2')
assert.ok(snip.startsWith('$') && snip.endsWith('$'), `short math wrap: ${snip}`)

// Short mixed examiner phrases must keep spaces (not "$Award M1 for…$").
const shortMixed = prepareMarkingSnippet('Award M1 for x^2 + 3x')
assert.ok(shortMixed.includes('Award M1'), `short mixed spaces: ${shortMixed}`)
assert.ok(!shortMixed.startsWith('$Award'), `short mixed not whole-wrapped: ${shortMixed}`)
assert.ok(shortMixed.includes('$') && shortMixed.includes('x^2'), `bare math still wrapped: ${shortMixed}`)

// Examiner prose with an equation must keep spaces (not one giant math node).
const demoReasoning =
  'You stated the nature of each point correctly, but stated it without justification. This mark needs the reasoning shown — either evaluate the second derivative (d²y/dx² = 6x − 12, giving −6 at x = 1 and +6 at x = 3) or show a sign change of dy/dx either side of each point. An unsupported assertion earns nothing here even when the conclusion is right.'
const prose = prepareMarkingSnippet(demoReasoning)
assert.ok(prose.includes('You stated the nature'), `prose spaces kept: ${prose.slice(0, 80)}`)
assert.ok(
  !prose.startsWith('$You stated') && !prose.startsWith('$Youstated'),
  `prose not whole-wrapped: ${prose.slice(0, 40)}`
)

console.log('normalize-marking-text.test.ts: ok')
