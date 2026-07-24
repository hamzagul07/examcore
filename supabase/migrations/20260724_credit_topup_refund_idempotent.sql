-- Make credit top-ups / refunds idempotent on the Polar order id.
--
-- The Polar webhook's only idempotency guard is an event-id claim row that it
-- DELETES whenever processing throws, so Polar can retry. That is safe for the
-- subscription events (idempotent upserts) but NOT for credit top-ups/refunds,
-- which mutate a balance: if apply_credit_topup commits and the client then sees
-- an error (a network blip after commit, a 500 that Polar retries), the claim is
-- deleted and the retry credits the account a SECOND time. The RPCs relied
-- entirely on that deletable claim ("idempotency guaranteed by the outer dedup").
--
-- Fix: give the money operation its own natural key. usage_events already records
-- each credit event with metadata.polar_order_id; a partial unique index on
-- (event_type, order_id) makes the ledger entry the idempotency point. Each RPC
-- now inserts the ledger row FIRST with ON CONFLICT DO NOTHING, and only moves
-- the balance when that row was newly inserted — so a retry (or a genuine
-- redelivery) is a no-op, whatever the outer claim did.

create unique index if not exists ux_usage_events_credit_order
  on public.usage_events (event_type, (metadata->>'polar_order_id'))
  where metadata ? 'polar_order_id';

create or replace function public.apply_credit_topup(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns void
  language plpgsql security definer set search_path to 'public'
as $$
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'apply_credit_topup: credits must be positive, got %', p_credits;
  end if;

  -- Ledger entry first, idempotent on the Polar order id. If this order's top-up
  -- is already recorded, the balance was already credited — do nothing.
  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_topup', p_credits, 'credits', p_metadata)
  on conflict (event_type, (metadata->>'polar_order_id'))
    where metadata ? 'polar_order_id'
    do nothing;

  -- Only credit the balance when the ledger row was newly inserted. A ref-less
  -- top-up (no polar_order_id, e.g. a manual grant) never conflicts, so it still
  -- applies — matching the previous behaviour for those.
  if not found then
    return;
  end if;

  insert into public.user_credits (user_id, balance, total_purchased, updated_at)
  values (p_user_id, p_credits, p_credits, now())
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
        updated_at = now();
end;
$$;

create or replace function public.apply_credit_refund(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns void
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_balance integer;
  v_deducted integer;
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'apply_credit_refund: credits must be positive, got %', p_credits;
  end if;

  select balance into v_balance
  from public.user_credits
  where user_id = p_user_id
  for update;

  if v_balance is null then
    return;
  end if;

  v_deducted := least(v_balance, p_credits);
  if v_deducted <= 0 then
    return;
  end if;

  -- Idempotent ledger entry keyed on the order id; skip if this order's refund is
  -- already recorded so a retried webhook cannot claw back credits twice.
  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_refund', -v_deducted, 'credits', p_metadata)
  on conflict (event_type, (metadata->>'polar_order_id'))
    where metadata ? 'polar_order_id'
    do nothing;

  if not found then
    return;
  end if;

  update public.user_credits
    set balance = balance - v_deducted,
        updated_at = now()
  where user_id = p_user_id;
end;
$$;
