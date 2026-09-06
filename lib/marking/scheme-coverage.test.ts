import assert from 'node:assert/strict'
import {
  schemeCoverageKey,
  schemeSessionLabel,
  subjectLacksBankedScheme,
} from '@/lib/marking/scheme-coverage'

// The key format is a contract between the server (which builds the set from
// mark_schemes) and the availability map. If these drift, every paper reports
// as uncovered — so they are pinned to the shapes actually in the table.
assert.equal(schemeSessionLabel('May/June', 2024), 'May/June 2024')
assert.equal(schemeSessionLabel('October/November', 2025), 'October/November 2025')
assert.equal(
  schemeCoverageKey('9709', '12', schemeSessionLabel('May/June', 2024)),
  '9709/12|May/June 2024'
)
assert.equal(
  schemeCoverageKey('9084', '11', 'October/November 2024'),
  '9084/11|October/November 2024'
)

// The tri-state. Only an explicit false means uncovered.
assert.equal(subjectLacksBankedScheme({ hasSchemes: false }), true)
assert.equal(subjectLacksBankedScheme({ hasSchemes: true }), false)

// Absent / unknown must NOT read as uncovered: a payload cached from before
// coverage was reported would otherwise demand a typed total from every
// student, in every subject, including the ones we hold schemes for.
assert.equal(subjectLacksBankedScheme({}), false)
assert.equal(subjectLacksBankedScheme(undefined), false)
assert.equal(subjectLacksBankedScheme(null), false)

console.log('scheme-coverage.test.ts: ok')
