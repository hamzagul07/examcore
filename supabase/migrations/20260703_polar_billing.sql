-- Polar billing: replace Stripe as the payment provider.
--
-- Adds the Polar linkage columns to user_subscriptions and a Polar webhook
-- idempotency ledger, mirroring the Stripe foundation (20260530_billing_foundation.sql).
-- The gating layer is provider-agnostic (reads tier/status/trial), so no other
-- schema changes are needed. Stripe columns/tables are left in place, unused.

-- ---------------------------------------------------------------------------
-- Polar linkage on user_subscriptions
-- ---------------------------------------------------------------------------
alter table public.user_subscriptions
  add column if not exists polar_customer_id text,
  add column if not exists polar_subscription_id text;

-- Uniqueness (guarded so re-runs don't error).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_subscriptions_polar_customer_id_key'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_polar_customer_id_key unique (polar_customer_id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_subscriptions_polar_subscription_id_key'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_polar_subscription_id_key unique (polar_subscription_id);
  end if;
end $$;

-- Webhooks look users up by polar_customer_id.
create index if not exists idx_user_subscriptions_polar_customer
  on public.user_subscriptions (polar_customer_id);
create index if not exists idx_user_subscriptions_polar_subscription
  on public.user_subscriptions (polar_subscription_id);

-- ---------------------------------------------------------------------------
-- Polar webhook event log (idempotency) — mirrors stripe_webhook_events
-- ---------------------------------------------------------------------------
create table if not exists public.polar_webhook_events (
  id text primary key,  -- Polar webhook delivery id, prevents duplicate processing
  type text not null,
  processed_at timestamptz default now(),
  payload jsonb
);

-- RLS enabled with ZERO policies: blocks anon/authenticated, service role
-- (webhook) bypasses RLS. Same pattern as stripe_webhook_events / pricing_config.
alter table public.polar_webhook_events enable row level security;
