import assert from 'node:assert/strict'
import { grantsAccess, resolveEntitlement } from '@/lib/billing/entitlement-source'

function active(tier: string, end: string | null = '2026-12-01T00:00:00Z') {
  return {
    tier,
    status: 'active',
    current_period_start: '2026-09-01T00:00:00Z',
    current_period_end: end,
  }
}

const canceled = (tier: string) => ({ tier, status: 'canceled' })

// The property that matters most: nothing changes for a user with no store
// purchase, which is every account that exists today.
const webOnly = resolveEntitlement(active('scholar'), null)
assert.equal(webOnly.tier, 'scholar')
assert.equal(webOnly.status, 'active')
assert.equal(webOnly.current_period_end, '2026-12-01T00:00:00Z')
assert.equal(webOnly.source, 'web')

const nothing = resolveEntitlement(null, null)
assert.equal(nothing.tier, 'free')
assert.equal(nothing.status, 'active')
assert.equal(nothing.source, 'web')

// A store purchase must be seen: free on the web, bought Starter in the app.
const bought = resolveEntitlement({ tier: 'free', status: 'active' }, active('student'))
assert.equal(bought.tier, 'student')
assert.equal(bought.source, 'store')

// A cancelled web subscription must not hide a live store one...
const liveStore = resolveEntitlement(canceled('mastery'), active('student'))
assert.equal(liveStore.tier, 'student', 'the active store sub decides access')
assert.equal(liveStore.source, 'store')

// ...and an expired store one must not hide a live web subscription.
const liveWeb = resolveEntitlement(active('scholar'), canceled('mastery'))
assert.equal(liveWeb.tier, 'scholar')
assert.equal(liveWeb.source, 'web')

// Paying in both places: give them what they paid the most for, either way round.
assert.equal(resolveEntitlement(active('student'), active('mastery')).tier, 'mastery')
assert.equal(resolveEntitlement(active('mastery'), active('student')).tier, 'mastery')
assert.equal(resolveEntitlement(active('student'), active('mastery')).source, 'store')
assert.equal(resolveEntitlement(active('mastery'), active('student')).source, 'web')

// Same tier both sides: keep whichever runs longer, or access ends on the
// earlier date while they are still paying elsewhere.
const longer = resolveEntitlement(
  active('scholar', '2026-10-01T00:00:00Z'),
  active('scholar', '2027-03-01T00:00:00Z')
)
assert.equal(longer.source, 'store')
assert.equal(longer.current_period_end, '2027-03-01T00:00:00Z')

// An open-ended row (lifetime, no end date) outlasts any dated one.
const openEnded = resolveEntitlement(active('scholar', '2026-10-01T00:00:00Z'), active('scholar', null))
assert.equal(openEnded.source, 'store')
assert.equal(openEnded.current_period_end, null)

// past_due keeps access during dunning, so it must beat a dead row — the
// resolver has to agree with ACTIVE_STATUSES.
const dunning = resolveEntitlement(
  { tier: 'free', status: 'active' },
  { tier: 'scholar', status: 'past_due' }
)
assert.equal(dunning.tier, 'scholar')
assert.equal(dunning.source, 'store')

// When neither grants access, the web row's status is what the billing page
// explains to them.
const bothDead = resolveEntitlement(canceled('scholar'), canceled('student'))
assert.equal(bothDead.status, 'canceled')
assert.equal(bothDead.tier, 'scholar')
assert.equal(bothDead.source, 'web', 'the web row explains why access ended')

// ...unless there is no web row at all, in which case a store-only user still
// gets their own reason.
const storeOnlyDead = resolveEntitlement(null, canceled('student'))
assert.equal(storeOnlyDead.source, 'store')
assert.equal(storeOnlyDead.status, 'canceled')

// Junk must never become entitlement.
assert.equal(
  resolveEntitlement(null, { tier: 'enterprise_unlimited', status: 'active' }).tier,
  'free',
  'an unknown tier name grants nothing'
)

assert.equal(grantsAccess({ tier: 'free', status: 'active' }), false)
assert.equal(grantsAccess({ tier: 'student', status: 'canceled' }), false)
assert.equal(grantsAccess({ tier: 'student', status: 'trialing' }), true)
assert.equal(grantsAccess(null), false)

console.log('entitlement-source: all assertions passed')
