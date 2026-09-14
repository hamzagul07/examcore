# Store entitlements (App Store / Play Store via RevenueCat)

Premium can now be bought in two places that know nothing about each other:

| Source | Provider | Table |
| --- | --- | --- |
| markscheme.app | Polar | `user_subscriptions` |
| iOS / Android app | RevenueCat (Apple, Google) | `store_subscriptions` |

## Why two tables

`user_subscriptions` is unique on `user_id`. Each provider's lifecycle events
arrive independently, so if both wrote that row an upsert from one would
overwrite the other's state — and the loser would be unrecoverable once the
winner lapsed. Store purchases therefore keep their own record, and
`lib/billing/entitlement-source.ts` decides which record grants access.

`resolveEntitlement(web, store)` in short:

1. A row that grants access beats one that does not — an active store
   subscription is not hidden by a cancelled web one, or vice versa.
2. Between two granting rows, the stronger tier wins; on a tie, the one that
   runs longer.
3. With no store purchase it returns the web row unchanged, so every existing
   account behaves exactly as before.

It is pure and covered by `lib/billing/entitlement-source.test.ts`
(`pnpm test:billing`).

## Where it takes effect

- **The gate.** `loadBillingContext` (`lib/billing/enforcement.ts`) reads both
  tables in the same `Promise.all` and resolves them. This is what decides
  marking access, caps and the meter, so it is always right — including for
  `/api/billing/summary`, which the mobile app reads.
- **Everything else.** ~20 other places read `user_subscriptions` directly (the
  billing page, the pricing page, the email campaigns). The webhook therefore
  *projects* the resolved entitlement into that row, so a student who paid in the
  app is not emailed an invitation to upgrade.

The projection is deliberately conservative:

- It never writes a row Polar is actively using (a live web subscription is
  never touched — the gate still resolves the stronger of the two).
- It only resets a row it owns (`provider = 'store'`).
- Sandbox events are recorded but never projected in production, so TestFlight
  and internal testing cannot mint free premium.

`user_subscriptions.provider` exists for that ownership check. Polar's
`subscription.revoked` matches `polar_subscription_id.is.null` so legacy rows can
still be revoked — a store-projected row also has a null Polar id, so without
`provider` an unrelated Polar revoke would cancel a store subscriber. The Polar
handler now claims `provider: 'polar'` on sync and filters on it when revoking.

## Setup (not yet done — all of this is pending)

1. **Apply the migration**

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/20260913_store_subscriptions.sql
   ```

   It creates `store_subscriptions` and `revenuecat_webhook_events` (RLS on,
   zero policies, grants revoked — service role only) and adds
   `user_subscriptions.provider`.

2. **Set the shared secret** in Vercel (all environments):

   ```
   REVENUECAT_WEBHOOK_SECRET=<a long random string>
   ```

   Without it the route returns 500 and grants nothing — it fails closed.

3. **Point RevenueCat at the endpoint.** In the RevenueCat dashboard →
   Integrations → Webhooks:

   - URL: `https://markscheme.app/api/billing/revenuecat-webhook`
   - Authorization header: the exact value of `REVENUECAT_WEBHOOK_SECRET`
     (compared with a timing-safe equality check).

4. **Name the store products so they map to a tier.** `lib/store/products.ts`
   matches on a substring of the product id:

   | Product id contains the word | Tier | Brand |
   | --- | --- | --- |
   | `starter` / `student` / `pro` | `student` | Starter |
   | `scholar` | `scholar` | Scholar |
   | `max` / `mastery` | `mastery` | Max |

   e.g. `markscheme_starter_monthly`, `markscheme_scholar_yearly`.

   Matching is on whole **tokens** (the id is split on anything that is not a
   letter or digit), not substrings — otherwise `pro` matches "product" and
   "promotional", and `max` matches "maximum", so an id like
   `com.markscheme.app.product.free_trial` would hand out a paid tier.

   An unmapped product that RevenueCat says is entitled grants
   `FALLBACK_PAID_TIER` (Starter) and logs an error. RevenueCat has already
   confirmed the purchase, so giving them nothing would be worse — but add the
   product to the map rather than leaving the fallback to guess.

5. **Entitlement id.** The app checks the `premium` entitlement
   (`ENTITLEMENT` in the mobile repo's `src/lib/iap.ts`); create it with that
   exact identifier and attach every product to it.

## Event handling

| RevenueCat event | Result |
| --- | --- |
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT`, `PRODUCT_CHANGE` | `active` |
| `CANCELLATION`, `SUBSCRIPTION_PAUSED` | stays `active` with `cancel_at_period_end` — access runs to expiry, as on the web |
| `BILLING_ISSUE` | `past_due`, which keeps access during dunning |
| `EXPIRATION` | `canceled` — access ends |
| `TRANSFER` | cleared from every `transferred_from` account |
| anything else (incl. `TEST`) | acknowledged, no change |

`app_user_id` must be the Supabase user id — the app sets it via
`Purchases.logIn`. Anonymous ids (`$RCAnonymousID:…`) mean the purchase happened
before sign-in; those are acknowledged and skipped rather than retried forever.

Idempotency mirrors the Polar webhook: the delivery id is claimed in
`revenuecat_webhook_events` *before* any side effect, `processed_at` is stamped
only on success, and the claim is released on failure so a retry reprocesses. A
claim older than the 10-minute lease can be taken over, which is why every write
on this path is an idempotent upsert keyed on `user_id`.

## Verifying

Send a test event from the RevenueCat dashboard, then:

```sql
select id, type, processed_at from revenuecat_webhook_events order by claimed_at desc limit 5;
select user_id, store, tier, status, environment, current_period_end from store_subscriptions;
select user_id, provider, tier, status from user_subscriptions where provider = 'store';
```

A sandbox test event should appear in the first two and **not** in the third.
