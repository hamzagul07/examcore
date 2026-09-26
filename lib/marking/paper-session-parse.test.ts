import assert from 'node:assert/strict'
import {
  formatPaperCode,
  formatPaperSession,
  parsePaperCode,
  parsePaperSession,
} from './paper-session-parse'

assert.deepEqual(parsePaperCode('9709/12'), { subject: '9709', component: '12' })
assert.deepEqual(parsePaperCode('  9709/12 '), { subject: '9709', component: '12' })
assert.equal(parsePaperCode('9709'), null)
assert.equal(parsePaperCode('9709/'), null)
assert.equal(parsePaperCode('/12'), null)
assert.equal(parsePaperCode(''), null)
assert.equal(parsePaperCode(null), null)

assert.deepEqual(parsePaperSession('May/June 2024'), { season: 'May/June', year: 2024 })
assert.deepEqual(parsePaperSession('  October/November 2023 '), {
  season: 'October/November',
  year: 2023,
})
// A bare year has no season to key on; a short code is not this format.
assert.equal(parsePaperSession('2024'), null)
assert.equal(parsePaperSession('w24'), null)
assert.equal(parsePaperSession(''), null)
assert.equal(parsePaperSession(undefined), null)

// Round trip: what the pickers build is what the parser reads back.
{
  const label = formatPaperSession('May/June', 2024)
  assert.equal(label, 'May/June 2024')
  assert.deepEqual(parsePaperSession(label), { season: 'May/June', year: 2024 })
  assert.equal(formatPaperSession('May/June', ''), '')
  assert.equal(formatPaperCode('9709', '12'), '9709/12')
  assert.equal(formatPaperCode('9709', ''), '')
}

console.log('paper-session-parse: ok')
