import { ACTIVE_STATUSES } from '@/lib/billing/access'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

/**
 * Entitlement can now arrive from two places that know nothing about each other:
 * the website (Polar) and the phone stores (Apple / Google, via RevenueCat).
 *
 * They cannot share one row. `user_subscriptions` is unique on user_id, and a
 * subscription's lifecycle events arrive independently per provider — so an
 * upsert from one provider would silently overwrite the other's state, and the
 * loser would be unrecoverable once the winner lapsed. Store purchases
 * therefore live in their own table, and this function decides which of the two
 * records a user's access at any moment.
 *
 * Pure and dependency-free so the precedence rules are actually testable.
 */

/**
 * Plan strength, matching the cap ladder in caps.ts (25 / 120 / 250 marks).
 * The DB enum names predate the brands: student=Starter, scholar=Scholar,
 * mastery=Max.
 */
const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  student: 1,
  scholar: 2,
  mastery: 3,
}

export type EntitlementRow = {
  tier?: string | null
  status?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
} | null

export type EntitlementSource = 'web' | 'store'

export type ResolvedEntitlement = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  /** Which record won. 'web' when there is nothing to choose between. */
  source: EntitlementSource
}

function asTier(value: string | null | undefined): SubscriptionTier {
  return value && value in TIER_RANK ? (value as SubscriptionTier) : 'free'
}

function asStatus(value: string | null | undefined): SubscriptionStatus {
  return (value ?? 'active') as SubscriptionStatus
}

/** True when this row, on its own, would actually grant paid access today. */
export function grantsAccess(row: EntitlementRow): boolean {
  if (!row) return false
  return asTier(row.tier) !== 'free' && ACTIVE_STATUSES.includes(asStatus(row.status))
}

function normalise(row: EntitlementRow, source: EntitlementSource): ResolvedEntitlement {
  return {
    tier: asTier(row?.tier),
    status: asStatus(row?.status),
    current_period_start: row?.current_period_start ?? null,
    current_period_end: row?.current_period_end ?? null,
    source,
  }
}

/**
 * Pick the record that decides a user's access.
 *
 * 1. A row that grants access beats one that does not — so an active store
 *    subscription is not hidden by a cancelled web one, and vice versa.
 * 2. Between two granting rows the stronger tier wins; on a tie, the one that
 *    runs longer. Someone paying twice gets what they paid the most for.
 * 3. When neither grants, the web row is returned unchanged. Its status is what
 *    the billing UI explains ("past due", "cancelled"), and this keeps the
 *    no-store-purchase case byte-for-byte identical to the old behaviour.
 */
export function resolveEntitlement(
  web: EntitlementRow,
  store: EntitlementRow
): ResolvedEntitlement {
  const webGrants = grantsAccess(web)
  const storeGrants = grantsAccess(store)

  if (storeGrants && !webGrants) return normalise(store, 'store')
  if (webGrants && !storeGrants) return normalise(web, 'web')

  if (webGrants && storeGrants) {
    const w = normalise(web, 'web')
    const s = normalise(store, 'store')
    if (TIER_RANK[s.tier] > TIER_RANK[w.tier]) return s
    if (TIER_RANK[w.tier] > TIER_RANK[s.tier]) return w
    // Same tier bought in both places: keep whichever covers the longer period,
    // so access does not end early on the one that lapses first. An open-ended
    // row (no period end) outlasts any dated one.
    if (!w.current_period_end) return w
    if (!s.current_period_end) return s
    return s.current_period_end > w.current_period_end ? s : w
  }

  // Neither grants access. Prefer a store row only when there is no web row at
  // all, so a store-only user still sees why their access ended.
  if (!web && store) return normalise(store, 'store')
  return normalise(web, 'web')
}
