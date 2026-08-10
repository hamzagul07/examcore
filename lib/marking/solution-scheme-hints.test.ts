import assert from 'node:assert/strict'
import { buildSolutionSchemeHints } from './solution-scheme-hints'

const hints = buildSolutionSchemeHints({
  awards: [
    {
      type: 'M1',
      earned: true,
      line_reference: 'Revenue 300,000',
      reasoning: 'Good method',
    },
    {
      type: 'A1',
      earned: false,
      line_reference: 'Profit 112,000',
      reasoning: 'You used the wrong fixed costs and lost this mark',
    },
  ],
  attemptTotal: 6,
  aiTotal: 6,
})

assert.match(hints, /Revenue 300,000/)
assert.match(hints, /Profit 112,000/)
assert.doesNotMatch(
  hints,
  /wrong fixed costs|lost this mark|Good method/,
  'examiner reasoning must not enter the model-answer prompt'
)

console.log('solution-scheme-hints: all assertions passed')
