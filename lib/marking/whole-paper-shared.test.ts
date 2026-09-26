import assert from 'node:assert/strict'
import {
  WHOLE_PAPER_CLAIM_STALE_MS,
  isWholePaperClaimStale,
} from './whole-paper-shared'

const NOW = Date.parse('2026-09-25T12:00:00Z')
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString()
const MINUTE = 60_000

// Only 'marking' can be stale.
assert.equal(isWholePaperClaimStale({ phase: 'queued' }, { now: NOW }), false)
assert.equal(isWholePaperClaimStale({ phase: 'complete', claimed_at: iso(60 * MINUTE) }, { now: NOW }), false)

// A stamped claim: fresh inside the window, dead beyond it.
assert.equal(isWholePaperClaimStale({ phase: 'marking', claimed_at: iso(MINUTE) }, { now: NOW }), false)
assert.equal(
  isWholePaperClaimStale({ phase: 'marking', claimed_at: iso(WHOLE_PAPER_CLAIM_STALE_MS + 1) }, { now: NOW }),
  true
)

// The bug: a job claimed by the pre-deploy run route has no claimed_at. It
// was stale on sight, so a paper in flight at deploy time got "Marking
// stopped… Retry" on the next poll and a second runner. Now its age from
// creation decides.
assert.equal(
  isWholePaperClaimStale({ phase: 'marking' }, { now: NOW, createdAt: iso(3 * MINUTE) }),
  false,
  'a stampless job created three minutes ago is still running'
)
assert.equal(
  isWholePaperClaimStale({ phase: 'marking' }, { now: NOW, createdAt: iso(WHOLE_PAPER_CLAIM_STALE_MS + 1) }),
  true,
  'a stampless job older than the window is dead'
)
// The claim stamp wins over creation when both exist (a resumed job is
// older than its latest claim).
assert.equal(
  isWholePaperClaimStale(
    { phase: 'marking', claimed_at: iso(MINUTE) },
    { now: NOW, createdAt: iso(60 * MINUTE) }
  ),
  false
)
// Nothing to go on at all: stale on sight, as before.
assert.equal(isWholePaperClaimStale({ phase: 'marking' }, { now: NOW }), true)
assert.equal(isWholePaperClaimStale({ phase: 'marking' }, { now: NOW, createdAt: null }), true)
assert.equal(isWholePaperClaimStale({ phase: 'marking', claimed_at: 'garbage' }, { now: NOW }), true)
assert.equal(isWholePaperClaimStale({ phase: 'marking' }, { now: NOW, createdAt: 'garbage' }), true)

console.log('whole-paper-shared: ok')
