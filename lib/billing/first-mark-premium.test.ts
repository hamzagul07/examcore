import assert from 'node:assert/strict'
import { hasFirstMarkPremium } from '@/lib/billing/features'

const first = { signedIn: true, isFirstEverMark: true }

// The whole point: a signed-in free student's first mark is premium.
assert.equal(hasFirstMarkPremium({ access: 'free', ...first }), true)

// Their second is not. This is the comparison the surface is built on — if it
// ever returns true twice, the loss frame is a lie and the cost is unbounded.
assert.equal(
  hasFirstMarkPremium({ access: 'free', signedIn: true, isFirstEverMark: false }),
  false
)

// Guests are excluded: no account to come back to, and one mark a day would
// make every guest mark premium.
assert.equal(
  hasFirstMarkPremium({ access: 'free', signedIn: false, isFirstEverMark: true }),
  false
)

// Paid users already have both features. Returning true would label their
// result "your next one won't have this", which is false for them.
for (const access of ['pro', 'scholar', 'max'] as const) {
  assert.equal(
    hasFirstMarkPremium({ access, ...first }),
    false,
    `${access} must not be flagged as a first-mark boost`
  )
}

console.log('first-mark-premium.test.ts: ok')
