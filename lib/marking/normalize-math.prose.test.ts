import assert from 'node:assert/strict'
import {
  normalizeMarkingResult,
  normalizeMathDelimiters,
  prepareMarkingProse,
} from './normalize-math'

// Existing delimiter behaviour unchanged.
assert.equal(
  normalizeMathDelimiters('The value (x^2) should be substituted.'),
  'The value $x^2$ should be substituted.'
)

// Full prose prep wraps bare math + remaps \\ce.
const prepared = prepareMarkingProse('Award M1 for \\ce{H2O} and x^2 + 1')
assert.ok(prepared.includes('\\mathrm{H2O}'), prepared)
assert.ok(prepared.includes('$'), prepared)
assert.ok(/x\^2/.test(prepared), prepared)

// Result walker covers criteria_results + margin_note.
const result = normalizeMarkingResult({
  summary: 'Got x^2 right',
  marks_awarded: [
    { reasoning: 'Used (\\binom{6}{2})', margin_note: 'need \\frac{1}{2}' },
  ],
  criteria_results: [
    {
      band_descriptor: 'Mentions \\ce{CO2}',
      justification: 'Clear x^2 step',
    },
  ],
})

assert.ok(
  String(result.summary).includes('$'),
  `summary wrapped: ${result.summary}`
)
assert.ok(
  String((result.marks_awarded as { margin_note: string }[])[0].margin_note).includes(
    '\\frac'
  ),
  'margin_note kept/wrapped'
)
assert.ok(
  String(
    (result.criteria_results as { band_descriptor: string }[])[0].band_descriptor
  ).includes('\\mathrm{CO2}'),
  'criteria band_descriptor sanitized'
)

console.log('normalize-math.prose.test.ts: ok')
