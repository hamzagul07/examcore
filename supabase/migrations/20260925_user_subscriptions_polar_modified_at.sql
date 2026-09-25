-- Record which version of the subscription the row reflects.
--
-- APPLY THIS BEFORE THE APPLICATION DEPLOY. It only adds a nullable column;
-- the webhook falls back to writing the row without it when it is missing, so
-- the order is not fatal — but until it exists the stale-event guard has no
-- stored version to compare against and can only catch the superseded case.
--
-- Polar does not guarantee delivery order, and syncSubscription upserts on
-- user_id. A late `subscription.updated` (status canceled, product Scholar)
-- landing after `subscription.revoked` (tier free) left the row as
-- tier=scholar/status=canceled — "paid but inactive" — which blocked the
-- user's free-tier marks and hard-blocked verified teachers. (Code review
-- 2026-09-25, §1.4.)
--
-- The webhook now stores the event's version here — Polar's `modified_at`
-- when set, else the standard-webhooks delivery timestamp — and skips any
-- event whose version is older than the one already applied. See
-- lib/billing/subscription-sync.ts for the decision.

alter table public.user_subscriptions
  add column if not exists polar_modified_at timestamptz;

comment on column public.user_subscriptions.polar_modified_at is
  'Version of the last subscription.* event applied to this row: Polar modified_at, else the webhook delivery time. Older events are skipped as stale.';
