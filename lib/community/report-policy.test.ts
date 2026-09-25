import assert from 'node:assert/strict'
import {
  DAILY_REPORT_CAP,
  FLAG_THRESHOLD,
  MIN_REPORTER_ACCOUNT_AGE_MS,
  countQualifyingReporters,
  shouldAutoHide,
  type ReporterProfile,
} from './report-policy'

assert.equal(FLAG_THRESHOLD, 3, 'three distinct reporters, not two')
assert.equal(DAILY_REPORT_CAP, 10)

const NOW = Date.parse('2026-09-25T12:00:00Z')
const AUTHOR = 'author'
const old = (days: number): string => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString()

function profiles(entries: Record<string, ReporterProfile>): Map<string, ReporterProfile> {
  return new Map(Object.entries(entries))
}

const established = profiles({
  r1: { createdAt: old(30), reputation: 5 },
  r2: { createdAt: old(10), reputation: 0 },
  r3: { createdAt: old(4), reputation: 12 },
  fresh: { createdAt: old(1), reputation: 50 },
  penalised: { createdAt: old(400), reputation: -1 },
  legacy: { createdAt: null, reputation: null },
})

const reports = (...ids: (string | null)[]) => ids.map((reporterId) => ({ reporterId }))

// Three established accounts hide; two do not.
assert.equal(countQualifyingReporters(reports('r1', 'r2', 'r3'), established, { authorId: AUTHOR, now: NOW }), 3)
assert.ok(shouldAutoHide(3))
assert.equal(shouldAutoHide(2), false, 'two reports never hide anything now')

// Two sockpuppets created this week add nothing.
assert.equal(
  countQualifyingReporters(reports('r1', 'fresh', 'fresh'), established, { authorId: AUTHOR, now: NOW }),
  1,
  'fresh accounts are ignored, and repeated ids count once'
)

// Exactly at the age boundary counts; one millisecond younger does not.
{
  const boundary = profiles({
    exact: { createdAt: new Date(NOW - MIN_REPORTER_ACCOUNT_AGE_MS).toISOString(), reputation: 0 },
    almost: { createdAt: new Date(NOW - MIN_REPORTER_ACCOUNT_AGE_MS + 1).toISOString(), reputation: 0 },
  })
  assert.equal(countQualifyingReporters(reports('exact'), boundary, { authorId: null, now: NOW }), 1)
  assert.equal(countQualifyingReporters(reports('almost'), boundary, { authorId: null, now: NOW }), 0)
}

// Negative reputation (a moderation penalty) disqualifies; zero is fine.
assert.equal(countQualifyingReporters(reports('penalised'), established, { authorId: null, now: NOW }), 0)
assert.equal(countQualifyingReporters(reports('r2'), established, { authorId: null, now: NOW }), 1)

// A profile row without created_at predates the column: established.
assert.equal(countQualifyingReporters(reports('legacy'), established, { authorId: null, now: NOW }), 1)

// No profile row at all: unknown account, does not count.
assert.equal(countQualifyingReporters(reports('ghost'), established, { authorId: null, now: NOW }), 0)

// Null reporter (deleted account) and the author reporting their own content are skipped.
assert.equal(
  countQualifyingReporters(reports(null, AUTHOR, 'r1'), established, { authorId: AUTHOR, now: NOW }),
  1
)

// Unparseable timestamps fail closed.
{
  const junk = profiles({ j: { createdAt: 'not a date', reputation: 0 } })
  assert.equal(countQualifyingReporters(reports('j'), junk, { authorId: null, now: NOW }), 0)
}

console.log('report-policy tests passed')
