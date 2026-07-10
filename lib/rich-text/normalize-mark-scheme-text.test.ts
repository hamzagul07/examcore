import assert from 'node:assert/strict'
import { normalizeMarkSchemeText } from './normalize-mark-scheme-text'

const sample =
  'Identify 240 as coefficient of x^2 in (1-4x)^6 OR 80a^2 as coefficient of x^2 in (2+ax)^5.'
const out = normalizeMarkSchemeText(sample)
assert.ok(out.includes('$x^2$'), `x^2 wrapped: ${out}`)
assert.ok(out.includes('$(1-4x)^6$') || out.includes('$(1 - 4x)^6$'), `binomial: ${out}`)
assert.ok(out.includes('$80a^2$'), `coefficient: ${out}`)

const eq = 'Set up equation: 240 = 12 x 80a^2. Student equated to 12 x 80a^2.'
const eqOut = normalizeMarkSchemeText(eq)
assert.ok(eqOut.includes('\\times'), `multiplication latex: ${eqOut}`)
assert.ok(eqOut.includes('240'), `lhs preserved: ${eqOut}`)

const combo = 'Common error: C(6,2)=20 and nCr.'
const comboOut = normalizeMarkSchemeText(combo)
assert.ok(comboOut.includes('\\binom'), `binom: ${comboOut}`)

// Chained fractions stash adjacent spans; restoring them must not leak the
// `\x00`/`\x01` control sentinels (which break KaTeX as "Unexpected character").
const chained = normalizeMarkSchemeText('Method: (1/4) + (1/4)(3/4) + (1/4)(3/4)^2')
assert.ok(
  !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(chained),
  `no sentinel leak: ${JSON.stringify(chained)}`
)

console.log('normalize-mark-scheme-text.test.ts: ok')
