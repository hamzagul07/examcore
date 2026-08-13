import assert from 'node:assert/strict'
import {
  resolveMarkingSubjectName,
  namedSubjectOrNull,
} from '@/lib/marking/subject-name'

/**
 * Subject naming across boards.
 *
 * Two bugs are pinned here. The first: resolving with the IB helper alone hands
 * Cambridge codes straight back, so every Cambridge mark — most of the traffic —
 * lost its subject name. The second: five IB subjects have an HL marking profile
 * and no SL twin, so an SL student's marking prompt was told the subject was
 * literally "ib-maths-ai-sl".
 */
async function main() {
  // --- Cambridge -------------------------------------------------------------
  assert.equal(resolveMarkingSubjectName('9708'), 'Economics')
  assert.equal(resolveMarkingSubjectName('9709'), 'Mathematics')
  assert.equal(resolveMarkingSubjectName('9700'), 'Biology')
  assert.equal(
    namedSubjectOrNull('9706'),
    'Accounting',
    'Cambridge codes must survive the named-or-null gate'
  )

  // --- IB, both levels -------------------------------------------------------
  assert.equal(resolveMarkingSubjectName('ib-biology-hl'), 'Biology')
  // The level twins: SL has no profile of its own, and must still be named.
  for (const [sl, expected] of [
    ['ib-maths-ai-sl', 'Mathematics: Applications and Interpretation'],
    ['ib-maths-aa-sl', 'Mathematics: Analysis and Approaches'],
    ['ib-psychology-sl', 'Psychology'],
    ['ib-business-management-sl', 'Business Management'],
    ['ib-computer-science-sl', 'Computer Science'],
  ] as const) {
    assert.equal(resolveMarkingSubjectName(sl), expected, `${sl} names itself`)
  }

  // --- unknowns --------------------------------------------------------------
  // A bare code is never dressed up as a name: callers that print prose need to
  // be able to tell "we know this subject" from "we only have an identifier".
  assert.equal(resolveMarkingSubjectName('zzz'), 'zzz')
  assert.equal(namedSubjectOrNull('zzz'), null)
  assert.equal(namedSubjectOrNull('zzz-sl'), null, 'twin lookup cannot invent a name')
  assert.equal(namedSubjectOrNull(''), null)
  assert.equal(namedSubjectOrNull(null), null)
  assert.equal(namedSubjectOrNull(undefined), null)

  // No subject at all still yields something printable for the marking prompt.
  assert.equal(resolveMarkingSubjectName(null), 'A-Level')

  // Whitespace is a real input here — codes arrive from form fields.
  assert.equal(resolveMarkingSubjectName('  9708  '), 'Economics')

  console.log('subject-name.test.ts: ok')
}

void main()
