import type { SubscriptionStatus } from '@/lib/database.types'

/**
 * Pure translation of RevenueCat's webhook vocabulary into ours.
 *
 * Kept out of the route so the money-deciding rules — who keeps access, who
 * loses it, and when — can actually be tested. See revenuecat-events.test.ts.
 */

export type StoreEventState = {
  status: SubscriptionStatus
  cancelAtPeriodEnd: boolean
  /** Whether this event leaves the student holding the entitlement. */
  entitled: boolean
}

/**
 * How each event type leaves the subscription, or `null` when the event does
 * not describe entitlement at all (TEST, TRANSFER — handled separately).
 *
 * CANCELLATION deliberately keeps `active`: exactly like Polar's
 * cancel-at-period-end, the student keeps what they paid for until it expires,
 * and the later EXPIRATION is what removes access. Treating a cancellation as
 * an immediate revocation would cut short a period they have already bought.
 */
export function stateForEvent(type: string): StoreEventState | null {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
    case 'PRODUCT_CHANGE':
      return { status: 'active', cancelAtPeriodEnd: false, entitled: true }
    case 'CANCELLATION':
    case 'SUBSCRIPTION_PAUSED':
      return { status: 'active', cancelAtPeriodEnd: true, entitled: true }
    case 'BILLING_ISSUE':
      // Dunning. `past_due` is in ACTIVE_STATUSES, so access continues — the
      // same grace web subscribers get while a card is retried.
      return { status: 'past_due', cancelAtPeriodEnd: false, entitled: true }
    case 'EXPIRATION':
      return { status: 'canceled', cancelAtPeriodEnd: false, entitled: false }
    default:
      return null
  }
}

/** RevenueCat's store name → the value our check constraint allows. */
export function storeName(store: string | null | undefined): string {
  switch ((store ?? '').toUpperCase()) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'app_store'
    case 'PLAY_STORE':
      return 'play_store'
    case 'STRIPE':
      return 'stripe'
    case 'PROMOTIONAL':
      return 'promotional'
    default:
      return 'unknown'
  }
}

export function isoOrNull(ms: number | null | undefined): string | null {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * RevenueCat's app_user_id is only ours if the app set it (Purchases.logIn with
 * the Supabase user id). Anonymous ids ($RCAnonymousID:…) mean the purchase
 * happened before sign-in and there is no account to credit.
 */
export function isSupabaseUserId(id: string | null | undefined): boolean {
  return !!id && UUID_RE.test(id)
}
