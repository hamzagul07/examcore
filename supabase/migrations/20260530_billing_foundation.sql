-- Sprint 42: Billing foundation — Stripe + Supabase
-- Credit-based + subscription billing plumbing. No enforcement yet (Sprint 43).
--
-- Invariants baked into this schema:
--   * Webhooks are at-least-once: writes use upsert, every event id is logged.
--   * Users link to Stripe via customer metadata, surfaced here as stripe_customer_id.
--   * RLS everywhere: users read their own rows; only the service role writes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- User subscriptions
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free', 'student', 'unlimited')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  billing_period text check (billing_period in ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  currency text default 'usd',
  region_tier text not null default 'A' check (region_tier in ('A', 'B', 'C')),
  founding_member boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Webhook lookups happen by stripe_customer_id / stripe_subscription_id.
create index if not exists idx_user_subscriptions_customer
  on public.user_subscriptions (stripe_customer_id);
create index if not exists idx_user_subscriptions_subscription
  on public.user_subscriptions (stripe_subscription_id);

-- Credit balance (separate table for fast reads + transactional safety)
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_purchased integer not null default 0,
  total_used integer not null default 0,
  updated_at timestamptz default now()
);

-- Usage events log (for Sprint 43 enforcement)
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null check (event_type in ('mark_single', 'mark_whole_paper', 'credit_topup', 'credit_grant')),
  attempt_id uuid,
  credits_delta integer not null,  -- negative for consumption, positive for grants
  source text not null check (source in ('subscription', 'credits', 'free_tier', 'admin_grant')),
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_usage_events_user_created
  on public.usage_events (user_id, created_at desc);

-- Stripe webhook event log (idempotency)
create table if not exists public.stripe_webhook_events (
  id text primary key,  -- Stripe event ID, prevents duplicate processing
  type text not null,
  processed_at timestamptz default now(),
  payload jsonb
);

-- Pricing config (regional pricing definitions)
create table if not exists public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  product_key text not null,  -- 'student' | 'unlimited' | 'credits_25' | 'credits_100' | 'credits_500'
  region_tier text not null check (region_tier in ('A', 'B', 'C')),
  currency text not null,
  amount_cents integer not null,
  stripe_price_id text not null,
  billing_period text check (billing_period in ('monthly', 'yearly') or billing_period is null),
  is_active boolean default true,
  unique(product_key, region_tier, currency, billing_period)
);

-- Webhook → tier resolution looks up by stripe_price_id.
create index if not exists idx_pricing_config_price
  on public.pricing_config (stripe_price_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.user_subscriptions enable row level security;
alter table public.user_credits enable row level security;
alter table public.usage_events enable row level security;

-- Decision #1: enable RLS with ZERO policies on these two. In Supabase, "no
-- policies" only blocks anon/auth access when RLS is ENABLED — otherwise
-- PostgREST exposes the rows. The service role bypasses RLS, so webhooks and
-- the setup script still read/write freely.
alter table public.stripe_webhook_events enable row level security;
alter table public.pricing_config enable row level security;

drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view own credits" on public.user_credits;
create policy "Users can view own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view own usage" on public.usage_events;
create policy "Users can view own usage"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Atomic credit top-up (Decision #4)
-- ---------------------------------------------------------------------------
-- Applied by the webhook for one-time credit purchases. SECURITY DEFINER so it
-- runs with table owner rights; we still gate it to the service role. Logs a
-- usage_events row in the same transaction as the balance bump so an
-- at-least-once webhook can't double-credit (caller dedupes on event id) and
-- can't credit-without-logging.
create or replace function public.apply_credit_topup(
  p_user_id uuid,
  p_credits integer,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'apply_credit_topup: credits must be positive, got %', p_credits;
  end if;

  insert into public.user_credits (user_id, balance, total_purchased, updated_at)
  values (p_user_id, p_credits, p_credits, now())
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
        updated_at = now();

  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_topup', p_credits, 'credits', p_metadata);
end;
$$;

-- Lock the function down: only the service role may execute it.
revoke all on function public.apply_credit_topup(uuid, integer, jsonb) from public;
revoke all on function public.apply_credit_topup(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.apply_credit_topup(uuid, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- New-user provisioning (Decision #3)
-- ---------------------------------------------------------------------------
-- Every new auth user gets a free subscription + 0-credit balance row. Idempotent
-- (on conflict do nothing) so re-runs / replays never error. Backfill below
-- handles users that already exist.
create or replace function public.handle_new_user_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_subscriptions (user_id, tier)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  insert into public.user_credits (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_billing on auth.users;
create trigger on_auth_user_created_billing
  after insert on auth.users
  for each row execute function public.handle_new_user_billing();

-- The trigger function never needs to be invoked via PostgREST RPC; revoke
-- execute so anon/authenticated can't call this SECURITY DEFINER function.
revoke all on function public.handle_new_user_billing() from public;
revoke all on function public.handle_new_user_billing() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill existing users
-- ---------------------------------------------------------------------------

insert into public.user_subscriptions (user_id, tier)
select id, 'free' from auth.users
on conflict (user_id) do nothing;

insert into public.user_credits (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Decision #2: every user that exists at migration time is a founding member.
-- (The original `created_at < now() - interval '1 minute'` matched nobody,
-- because these rows are inserted in this same migration.)
update public.user_subscriptions
set founding_member = true;
