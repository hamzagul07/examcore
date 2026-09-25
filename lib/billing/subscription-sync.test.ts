import assert from 'node:assert/strict'
import {
  decideSubscriptionSync,
  parseWebhookTimestamp,
  subscriptionEventVersion,
  syncedSubscriptionTier,
} from '@/lib/billing/subscription-sync'

const t = (s: string) => new Date(s)

// No row, or a row from before polar_subscription_id was recorded: apply.
assert.deepEqual(decideSubscriptionSync(null, { id: 'S1', status: 'active', version: null }), {
  apply: true,
})
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: null, status: 'active' },
    { id: 'S1', status: 'canceled', version: null }
  ),
  { apply: true },
  'a legacy row with no subscription id takes whatever arrives'
)

// Scenario B: cancel S1, buy S2 (live on the row), late `updated` for S1.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S2', status: 'active', polar_modified_at: null },
    { id: 'S1', status: 'canceled', version: t('2026-09-01T00:00:00Z') }
  ),
  { apply: false, reason: 'superseded' },
  'a dead event for another subscription never clobbers the live one'
)
// …but a LIVE event for a new subscription replaces the old live row. A
// customer holds one live Polar subscription; the newer one is the truth, and
// skipping it would strand the purchase behind the row (the old one's revoke
// is scoped by id, so it cannot undo this later).
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: '2026-09-01T00:00:00Z' },
    { id: 'S2', status: 'active', version: t('2026-09-02T00:00:00Z') }
  ),
  { apply: true }
)
// A live event for a different id that is OLDER than the stored version is a
// delayed delivery from the previous subscription's life: stale.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S2', status: 'active', polar_modified_at: '2026-09-02T00:00:00Z' },
    { id: 'S1', status: 'active', version: t('2026-08-31T00:00:00Z') }
  ),
  { apply: false, reason: 'stale_event' }
)
// A dead event for another id when the row is itself dead: nothing to protect.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'canceled' },
    { id: 'S2', status: 'canceled', version: null }
  ),
  { apply: true }
)

// Scenario A: same subscription, an `updated` (canceled) whose modified_at is
// older than what the row already holds.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'canceled', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'canceled', version: t('2026-09-10T11:59:00Z') }
  ),
  { apply: false, reason: 'stale_event' }
)
// Same version (a redelivery) and newer versions apply.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'active', version: t('2026-09-10T12:00:00Z') }
  ),
  { apply: true }
)

// Scenario A, the common ordering: Polar emits `subscription.updated`
// ALONGSIDE `subscription.revoked` for one modification, so the twin carries
// the SAME modified_at the revoke stamped. Dead on dead, not newer: stale.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'canceled', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'canceled', version: t('2026-09-10T12:00:00Z') }
  ),
  { apply: false, reason: 'stale_event' },
  'the revoke twin must not resurrect a paid tier'
)
// A genuinely newer dead event (a later status change) still applies.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'canceled', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'unpaid', version: t('2026-09-10T12:00:01Z') }
  ),
  { apply: true }
)
// A dead event on a LIVE row at the same version is not that case: it is the
// cancellation itself arriving, and it applies.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'canceled', version: t('2026-09-10T12:00:00Z') }
  ),
  { apply: true }
)
// Dead on dead with an unknown version on either side still applies (the
// row cannot be frozen on a missing timestamp) — which is safe only because
// syncedSubscriptionTier writes such a row as free, below.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'canceled', polar_modified_at: null },
    { id: 'S1', status: 'canceled', version: t('2026-09-10T12:00:00Z') }
  ),
  { apply: true }
)

// --- what the synced row records ---------------------------------------------
// Whatever slips past the ordering guard, a dead subscription is written as a
// dead row: tier 'free', matching the revoke handler. `tier=scholar` with
// `status=canceled` is the "paid but inactive" state that blocked free marks.
assert.equal(syncedSubscriptionTier('canceled', 'scholar'), 'free')
assert.equal(syncedSubscriptionTier('unpaid', 'mastery'), 'free')
assert.equal(syncedSubscriptionTier('incomplete', 'scholar'), 'free')
assert.equal(syncedSubscriptionTier(null, 'scholar'), 'free')
assert.equal(syncedSubscriptionTier('active', 'scholar'), 'scholar')
assert.equal(syncedSubscriptionTier('trialing', 'mastery'), 'mastery')
assert.equal(syncedSubscriptionTier('past_due', 'scholar'), 'scholar', 'dunning keeps access')
assert.equal(syncedSubscriptionTier('active', null), 'free', 'unknown product defaults to free')
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'past_due', version: t('2026-09-11T00:00:00Z') }
  ),
  { apply: true }
)
// Unknown versions on either side never block: better to apply than to freeze
// a row on a missing timestamp.
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: null },
    { id: 'S1', status: 'canceled', version: t('2026-01-01T00:00:00Z') }
  ),
  { apply: true }
)
assert.deepEqual(
  decideSubscriptionSync(
    { polar_subscription_id: 'S1', status: 'active', polar_modified_at: '2026-09-10T12:00:00Z' },
    { id: 'S1', status: 'canceled', version: null }
  ),
  { apply: true }
)

// --- version selection --------------------------------------------------------
assert.equal(
  subscriptionEventVersion(t('2026-09-10T12:00:00Z'), t('2026-09-12T00:00:00Z'))?.toISOString(),
  '2026-09-10T12:00:00.000Z',
  'modified_at beats the delivery timestamp'
)
assert.equal(
  subscriptionEventVersion(null, t('2026-09-12T00:00:00Z'))?.toISOString(),
  '2026-09-12T00:00:00.000Z',
  'a freshly created object has no modified_at — fall back to delivery time'
)
assert.equal(subscriptionEventVersion(null, null), null)
assert.equal(subscriptionEventVersion('garbage', null), null)

assert.equal(parseWebhookTimestamp('1758800000')?.toISOString(), '2025-09-25T11:33:20.000Z')
assert.equal(parseWebhookTimestamp(''), null)
assert.equal(parseWebhookTimestamp('abc'), null)
assert.equal(parseWebhookTimestamp(undefined), null)

console.log('subscription-sync.test.ts: ok')
