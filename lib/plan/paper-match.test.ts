import assert from 'node:assert/strict'
import { componentDigit, componentToPapers, normalisePaperLabel, paperMatchesComponent } from '@/lib/plan/paper-match'

// --- leaf labels, every form the trees use ----------------------------------------------------

const LABELS: Array<[string | null | undefined, string[]]> = [
  ['P1', ['P1']],
  ['P1/P2', ['P1', 'P2']],
  ['P1_P2', ['P1', 'P2']],
  ['P1, P2', ['P1', 'P2']],
  ['P3, P4', ['P3', 'P4']],
  ['P1, P2, P3, P4', ['P1', 'P2', 'P3', 'P4']],
  ['P1/P2/P3', ['P1', 'P2', 'P3']],
  ['AS', ['P1', 'P2']],
  ['A Level', ['P3', 'P4']],
  ['AL', ['P3', 'P4']],
  ['Paper 1', ['P1']],
  ['Paper 1 (SL)', ['P1']],
  ['HL Paper 2', ['P2']],
  ['paper_2', ['P2']],
  ['P3 HL', ['P3']],
  ['P3 Option', ['P3']],
  ['p2', ['P2']],
  ['Essay', []],
  ['IO', []],
  ['', []],
  ['   ', []],
  [null, []],
  [undefined, []],
]
for (const [label, expected] of LABELS) {
  assert.deepEqual(normalisePaperLabel(label), expected, `label ${JSON.stringify(label)}`)
}

// --- components, as the catalogue names them ----------------------------------------------------

const COMPONENTS: Array<[string | null | undefined, string[]]> = [
  ['Paper 1', ['P1']],
  ['Paper 3', ['P3']],
  ['12', ['P1']],
  ['13', ['P1']],
  ['31', ['P3']],
  ['42', ['P4']],
  ['P3', ['P3']],
  ['HL Paper 2', ['P2']],
  ['Paper 1 (SL)', ['P1']],
  ['Coursework', []],
  ['', []],
  [null, []],
  [undefined, []],
]
for (const [component, expected] of COMPONENTS) {
  assert.deepEqual(componentToPapers(component), expected, `component ${JSON.stringify(component)}`)
}

// --- the digit for a paper_code filter ----------------------------------------------------------

assert.equal(componentDigit('Paper 1'), '1')
assert.equal(componentDigit('12'), '1')
assert.equal(componentDigit('P3'), '3')
assert.equal(componentDigit('HL Paper 2'), '2')
assert.equal(componentDigit('Coursework'), null)
assert.equal(componentDigit(null), null)
assert.equal(componentDigit(''), null)

// --- matching -----------------------------------------------------------------------------------

assert.equal(paperMatchesComponent('P1', 'Paper 1'), true)
assert.equal(paperMatchesComponent('P1/P2', '12'), true)
assert.equal(paperMatchesComponent('AS', 'Paper 2'), true)
assert.equal(paperMatchesComponent('A Level', 'Paper 3'), true)
assert.equal(paperMatchesComponent('A Level', 'Paper 1'), false)
assert.equal(paperMatchesComponent('P3', '12'), false)
assert.equal(paperMatchesComponent('Paper 1 (SL)', 'HL Paper 2'), false)
assert.equal(paperMatchesComponent('Essay', 'Paper 1'), null, 'unreadable leaf: no claim')
assert.equal(paperMatchesComponent('P1', 'Coursework'), null, 'unreadable component: no claim')
assert.equal(paperMatchesComponent(undefined, undefined), null)
assert.equal(paperMatchesComponent('', ''), null)

console.log('paper-match.test.ts: ok')
