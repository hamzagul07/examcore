import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACTIVE_STATUSES } from '@/lib/billing/access'
import { FALLBACK_PAID_TIER, tierForStoreProduct } from '@/lib/store/products'
import {
  isSupabaseUserId,
  isoOrNull,
  stateForEvent,
  storeName,
} from '@/lib/store/revenuecat-events'

// Every event type RevenueCat can send us, so a new one can't be forgotten
// silently: anything not listed must fall through to null.
const ENTITLING = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'PRODUCT_CHANGE',
  'CANCELLATION',
  'SUBSCRIPTION_PAUSED',
  'BILLING_ISSUE',
]
const ENDING = ['EXPIRATION']
const IGNORED = ['TEST', 'TRANSFER', 'SOMETHING_NEW_REVENUECAT_ADDS', '']

// ---------------------------------------------------------------------------
// The statuses we write must be ones the column will accept. Read straight from
// the migration so the code and the check constraint cannot drift apart.
// ---------------------------------------------------------------------------
const migration = readFileSync('supabase/migrations/20260913_store_subscriptions.sql', 'utf8')

function allowedValues(column: string): string[] {
  const match = migration.match(new RegExp(`check \\(${column} in \\(([^)]*)\\)\\)`, 's'))
  assert.ok(match, `no check constraint found for ${column}`)
  return [...match[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
}

const ALLOWED_STATUSES = allowedValues('status')
const ALLOWED_STORES = allowedValues('store')
assert.ok(ALLOWED_STATUSES.length >= 5, 'sanity: parsed the status constraint')

for (const type of [...ENTITLING, ...ENDING]) {
  const state = stateForEvent(type)
  assert.ok(state, `${type} must be handled`)
  assert.ok(
    ALLOWED_STATUSES.includes(state.status),
    `${type} → "${state.status}" would be rejected by the check constraint`
  )
}

// ---------------------------------------------------------------------------
// "Entitled" and "actually grants access" must agree. If they ever disagree we
// would record someone as holding premium while the gate gave them nothing.
// ---------------------------------------------------------------------------
for (const type of ENTITLING) {
  const state = stateForEvent(type)!
  assert.equal(state.entitled, true, `${type} should leave them entitled`)
  assert.ok(
    ACTIVE_STATUSES.includes(state.status),
    `${type} claims entitlement but "${state.status}" is not an access-granting status`
  )
}
for (const type of ENDING) {
  const state = stateForEvent(type)!
  assert.equal(state.entitled, false)
  assert.equal(
    ACTIVE_STATUSES.includes(state.status),
    false,
    `${type} must not leave an access-granting status behind`
  )
}
for (const type of IGNORED) {
  assert.equal(stateForEvent(type), null, `${type} must not be treated as entitlement`)
}

// A cancellation is NOT a revocation: they keep the period they already paid
// for, and the later EXPIRATION is what ends it. Getting this backwards would
// cut off paying customers the moment they turned off auto-renew.
const cancelled = stateForEvent('CANCELLATION')!
assert.equal(cancelled.status, 'active')
assert.equal(cancelled.cancelAtPeriodEnd, true)
assert.equal(cancelled.entitled, true)

const paused = stateForEvent('SUBSCRIPTION_PAUSED')!
assert.equal(paused.cancelAtPeriodEnd, true, 'a pause also stops the renewal')

// Dunning keeps access, exactly as it does for web subscribers.
assert.equal(stateForEvent('BILLING_ISSUE')!.status, 'past_due')

// Expiry is the only thing that takes access away.
assert.equal(stateForEvent('EXPIRATION')!.status, 'canceled')
assert.equal(stateForEvent('EXPIRATION')!.cancelAtPeriodEnd, false)

// ---------------------------------------------------------------------------
// Store names must also satisfy their constraint.
// ---------------------------------------------------------------------------
assert.equal(storeName('APP_STORE'), 'app_store')
assert.equal(storeName('MAC_APP_STORE'), 'app_store')
assert.equal(storeName('PLAY_STORE'), 'play_store')
assert.equal(storeName('play_store'), 'play_store', 'case must not matter')
assert.equal(storeName('PROMOTIONAL'), 'promotional')
assert.equal(storeName('AMAZON'), 'unknown', 'an unhandled store must not break the insert')
assert.equal(storeName(null), 'unknown')
assert.equal(storeName(undefined), 'unknown')
for (const input of ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL', 'AMAZON', null]) {
  assert.ok(
    ALLOWED_STORES.includes(storeName(input)),
    `storeName(${String(input)}) is not an allowed store value`
  )
}

// ---------------------------------------------------------------------------
// Product → tier. These ids are typed by hand in two store consoles, so the
// matcher has to be strict about what counts as a plan name.
// ---------------------------------------------------------------------------
assert.equal(tierForStoreProduct('markscheme_starter_monthly'), 'student')
assert.equal(tierForStoreProduct('markscheme_scholar_yearly'), 'scholar')
assert.equal(tierForStoreProduct('markscheme_max_monthly'), 'mastery')
assert.equal(tierForStoreProduct('markscheme_mastery_annual'), 'mastery')
assert.equal(tierForStoreProduct('com.markscheme.app.scholar.monthly'), 'scholar')
assert.equal(tierForStoreProduct('MARKSCHEME_STARTER_MONTHLY'), 'student', 'case must not matter')

// The regression this matcher exists for: a substring match read a plan name
// out of ordinary words and handed out paid tiers for free.
assert.equal(tierForStoreProduct('com.markscheme.app.product.free_trial'), null)
assert.equal(tierForStoreProduct('markscheme_promotional_grant'), null)
assert.equal(tierForStoreProduct('markscheme_promo_trial'), null)
assert.equal(tierForStoreProduct('markscheme_maximum_pack'), null)

assert.equal(tierForStoreProduct(null), null)
assert.equal(tierForStoreProduct(''), null)
assert.equal(tierForStoreProduct('totally_unknown_sku'), null)
assert.equal(FALLBACK_PAID_TIER, 'student', 'an unmapped paid product must never land on Max')

// ---------------------------------------------------------------------------
// Timestamps and identity.
// ---------------------------------------------------------------------------
assert.equal(isoOrNull(1757721600000), new Date(1757721600000).toISOString())
assert.equal(isoOrNull(null), null)
assert.equal(isoOrNull(undefined), null)
assert.equal(isoOrNull(Number.NaN), null, 'NaN would become an Invalid Date')
assert.equal(isoOrNull(Number.POSITIVE_INFINITY), null)

assert.equal(isSupabaseUserId('a1000004-0000-4000-8000-000000000004'), true)
assert.equal(isSupabaseUserId('A1000004-0000-4000-8000-000000000004'), true)
assert.equal(isSupabaseUserId('$RCAnonymousID:9f2c1b7d4e'), false)
assert.equal(isSupabaseUserId('not-a-uuid'), false)
assert.equal(isSupabaseUserId(''), false)
assert.equal(isSupabaseUserId(null), false)

console.log('revenuecat-events: all assertions passed')
