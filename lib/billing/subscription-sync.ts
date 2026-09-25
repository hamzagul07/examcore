/**
 * Whether a `subscription.*` webhook may overwrite the stored subscription row.
 *
 * Polar does not guarantee delivery order, and the row is keyed on `user_id`,
 * so a late event used to clobber whatever was there:
 *
 *   A. `subscription.updated` (status canceled, product still Scholar) landing
 *      after `subscription.revoked` (tier free) left `tier=scholar,
 *      status=canceled` — a state the gate reads as "paid but inactive", which
 *      blocks free-tier marks and hard-blocked verified teachers.
 *   B. cancel S1, buy S2 (Max), then a late `updated` for S1 overwrote the row
 *      with S1's tier and status. A paying Max customer lost access until the
 *      next S2 event, which may never come.
 *
 * Two guards, both pure so they can be tested without the webhook route:
 *
 *   - a DEAD event for a subscription other than the live one on the row is
 *     superseded (B). A LIVE event for a different id is applied — a customer
 *     holds one live Polar subscription, so a newer live one is the truth, and
 *     skipping it would strand the new purchase behind the old row;
 *   - an event whose version is older than the stored version is stale (A).
 *     The version is Polar's `modified_at` when present, else the delivery
 *     timestamp. Only compared when both sides are known;
 *   - a DEAD event for a subscription the row already holds as dead is stale
 *     unless it is strictly newer. Polar emits `subscription.updated`
 *     alongside `subscription.revoked` for the same modification — same
 *     `modified_at` — so "older than stored" alone let the twin through, and
 *     it re-applied the product's tier on a row the revoke had just set to
 *     free. Nothing about a dead-on-dead redelivery can improve the row.
 *
 * And one rule for what a synced row RECORDS (syncedSubscriptionTier): a
 * subscription whose status no longer grants access is written with
 * tier='free', whatever product it was for — exactly what the revoke handler
 * writes. `tier=scholar, status=canceled` is the state the gate reads as
 * "paid but inactive", which blocks free-tier marks and is the state both
 * scenarios above produced.
 *
 * Lives outside the route so the decision can be exercised without importing
 * the Polar SDK, the Supabase service client and next/server alongside it.
 */

/** Statuses under which a subscription still grants access (see access.ts). */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return !!status && LIVE_STATUSES.has(status)
}

export type StoredSubscription = {
  polar_subscription_id: string | null
  status: string | null
  /** The version of the last event applied — Polar `modified_at`, else delivery time. */
  polar_modified_at?: string | null
} | null

export type IncomingSubscription = {
  id: string
  status: string
  /** Polar `modified_at` when set, otherwise the webhook delivery timestamp. */
  version: Date | null
}

export type SyncDecision =
  | { apply: true }
  | { apply: false; reason: 'superseded' | 'stale_event' }

export function decideSubscriptionSync(
  existing: StoredSubscription,
  incoming: IncomingSubscription
): SyncDecision {
  if (!existing?.polar_subscription_id) return { apply: true }

  const storedVersion = parseVersion(existing.polar_modified_at)
  const bothVersionsKnown = !!storedVersion && !!incoming.version
  const olderThanStored =
    bothVersionsKnown && incoming.version!.getTime() < storedVersion!.getTime()
  const notNewerThanStored =
    bothVersionsKnown && incoming.version!.getTime() <= storedVersion!.getTime()

  if (existing.polar_subscription_id !== incoming.id) {
    // A dead event about another subscription can never beat the live one on
    // the row, whatever its timestamp says.
    if (!isLiveSubscriptionStatus(incoming.status) && isLiveSubscriptionStatus(existing.status)) {
      return { apply: false, reason: 'superseded' }
    }
    return olderThanStored ? { apply: false, reason: 'stale_event' } : { apply: true }
  }

  // Same subscription, already dead on the row, dead again in the event and
  // no newer than what was applied: the revoke's `updated` twin. Skipped, so
  // it cannot rewrite what the revoke wrote.
  if (
    !isLiveSubscriptionStatus(incoming.status) &&
    !isLiveSubscriptionStatus(existing.status) &&
    notNewerThanStored
  ) {
    return { apply: false, reason: 'stale_event' }
  }

  return olderThanStored ? { apply: false, reason: 'stale_event' } : { apply: true }
}

/**
 * The tier a synced row records for this event.
 *
 * A subscription that no longer grants access (canceled, unpaid, incomplete…)
 * is written as 'free' whatever product it named. This is what
 * `subscription.revoked` writes, and the sync group must agree with it: the
 * `updated` twin of a revoke, or any late dead event that passes the version
 * check, otherwise re-applied `tier=scholar` on top of `status=canceled`. The
 * gate reads that pair as "paid but inactive" — no free-tier marks, and in
 * enforce mode with no credits the student is blocked outright.
 *
 * The product's tier is still what the caller reports (emails, logs); only
 * the stored row is normalised.
 */
export function syncedSubscriptionTier<Tier extends string>(
  status: string | null | undefined,
  resolvedTier: Tier | null | undefined
): Tier | 'free' {
  if (!isLiveSubscriptionStatus(status)) return 'free'
  return resolvedTier ?? 'free'
}

/**
 * The version an incoming event carries: Polar's own modification stamp when
 * it has one (null on a freshly created object), else the standard-webhooks
 * delivery timestamp. The delivery time is the weaker signal — a retry of an
 * old event is delivered late — which is why `modified_at` is preferred.
 */
export function subscriptionEventVersion(
  modifiedAt: Date | string | null | undefined,
  deliveredAt: Date | null | undefined
): Date | null {
  const modified = parseVersion(modifiedAt)
  if (modified) return modified
  return deliveredAt && !Number.isNaN(deliveredAt.getTime()) ? deliveredAt : null
}

/** Parse a standard-webhooks `webhook-timestamp` header (unix seconds). */
export function parseWebhookTimestamp(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000)
}

function parseVersion(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
