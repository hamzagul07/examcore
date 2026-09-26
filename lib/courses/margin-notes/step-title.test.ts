import assert from 'node:assert/strict'
import { firstClause, stepTitleFromCaption } from './step-title'

assert.equal(firstClause('A power supply provides the e.m.f. that drives charge. Then more.'), 'A power supply provides the e.m.f. that drives charge')
assert.equal(firstClause('Potential difference (p.d.) is measured across R. Next sentence.'), 'Potential difference (p.d.) is measured across R')
assert.equal(firstClause('See Fig. 2 for the layout. It shows the circuit.'), 'See Fig. 2 for the layout')
assert.equal(firstClause('Current splits — each branch takes a share.'), 'Current splits')
assert.equal(firstClause('Short caption'), 'Short caption')

assert.equal(stepTitleFromCaption('A power supply provides the e.m.f.', 0), 'A power supply provides the e.m.f.')
assert.equal(
  stepTitleFromCaption('A power supply provides the e.m.f. that drives charge around the complete circuit.', 0),
  'A power supply provides the e.m.f. that…',
  'long clauses cut at a word boundary, never mid-word'
)
assert.equal(stepTitleFromCaption(undefined, 2), 'Step 3')
assert.equal(stepTitleFromCaption('   ', 0), 'Step 1')
assert.equal(stepTitleFromCaption('Resistors in series add: R = R1 + R2 + R3, always.', 0), 'Resistors in series add: R = R1 + R2 + R3,…'.replace(',…', '…'))

console.log('step-title.test.ts: ok')
