-- Store (App Store / Play Store) subscriptions, arriving via RevenueCat.
--
-- Deliberately NOT rows in user_subscriptions: that table is unique on user_id,
-- and Polar's lifecycle events are independent of the stores'. Sharing one row
-- means an upsert from one provider overwrites the other's state, and the loser
-- is unrecoverable once the winner lapses. lib/billing/entitlement-source.ts
-- resolves which of the two decides access.

create table if not exists public.store_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Where the money came from. 'promotional' covers RevenueCat grants.
  store text not null default 'unknown'
    check (store in ('app_store', 'play_store', 'stripe', 'promotional', 'unknown')),
  revenuecat_app_user_id text,
  product_id text,
  entitlement_ids text[],
  tier text not null default 'free'
    check (tier in ('free', 'student', 'scholar', 'mastery')),
  -- Same vocabulary as user_subscriptions so a resolved entitlement can be
  -- compared and projected without translating.
  status text not null default 'active'
    check (status in ('active', 'past_due', 'canceled', 'incomplete',
                      'incomplete_expired', 'trialing', 'unpaid')),
  store_transaction_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  -- 'SANDBOX' purchases must never grant paid access in production; the webhook
  -- records them but refuses to project them.
  environment text not null default 'PRODUCTION',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TRANSFER events address a user by their RevenueCat app_user_id.
create index if not exists idx_store_subscriptions_rc_user
  on public.store_subscriptions (revenuecat_app_user_id);

-- RLS enabled with ZERO policies: blocks anon/authenticated outright, the
-- service role (webhook + server reads) bypasses RLS. Same pattern as
-- polar_webhook_events. Belt and braces on the grants too, because a table-wide
-- grant would otherwise survive RLS being relaxed later.
alter table public.store_subscriptions enable row level security;
revoke all on public.store_subscriptions from anon, authenticated;

-- Webhook delivery ids, for idempotency. Mirrors polar_webhook_events exactly,
-- including the claim/lease columns: processed_at stays NULL until the handler
-- finishes, so an abandoned claim can be told apart from a completed one.
create table if not exists public.revenuecat_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb,
  claimed_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.revenuecat_webhook_events enable row level security;
revoke all on public.revenuecat_webhook_events from anon, authenticated;

-- Which provider owns the user_subscriptions row.
--
-- Polar's subscription.revoked matches `polar_subscription_id.is.null` so that
-- rows written before that column existed can still be revoked. A row projected
-- from a store purchase also has a null polar_subscription_id, so without this
-- column an unrelated Polar revoke would wipe a live store subscriber's access.
alter table public.user_subscriptions
  add column if not exists provider text not null default 'polar'
    check (provider in ('polar', 'stripe', 'store'));

comment on column public.user_subscriptions.provider is
  'Which billing provider last wrote this row. Polar handlers must not modify a row owned by ''store'' — see lib/billing/entitlement-source.ts.';
