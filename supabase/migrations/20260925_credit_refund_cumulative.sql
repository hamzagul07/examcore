-- Partial refunds: reverse the delta, not the first slice only; and let a
-- refund that arrives before its top-up net the top-up.
--
-- The refund ledger (20260724) keys one 'credit_refund' row on the Polar order
-- id, which made a retried webhook harmless — and made every refund after the
-- first a no-op. Polar reports `refunded_amount` as a running total per order,
-- so a 10% goodwill refund followed by a full refund arrived as 10% then 100%:
-- the first wrote the row, the second hit ON CONFLICT DO NOTHING, and the
-- customer kept 90% of a pack they had been fully refunded for. (Code review
-- 2026-09-25, §2 billing.)
--
-- The row now records the CUMULATIVE reversal for the order:
--   metadata.reversed_credits  — how many of the pack are reversed so far
--                                (the webhook passes the cumulative share);
--   metadata.deducted_credits  — how many were actually taken from the balance
--                                (the balance floors at zero, so this can lag);
--   credits_delta              — always -deducted_credits, so the ledger sums.
-- A second order.refunded deducts reversed_new − reversed_so_far; a redelivery
-- of the same one deducts nothing.
--
-- Ordering: `order.refunded` can be delivered before `order.paid`. The refund
-- used to find no balance, write no row, and the later top-up granted the whole
-- pack. The refund row is now written even when nothing can be deducted yet,
-- and the top-up RPCs settle the outstanding part of it before crediting —
-- so the pack arrives net of the refund.
--
-- Legacy rows (written by the 20260724 function) carry neither key: they hold
-- only credits_delta = -least(balance, credits), i.e. what could be deducted,
-- which may be LESS than what was reversed. Reading reversed = deducted for
-- them would make a redelivered (or later cumulative) order.refunded compute a
-- positive delta and deduct the shortfall again from credits the customer has
-- since bought in a different order — credits the design says cannot be
-- reclaimed. The old row-per-order key made such a redelivery a no-op, and
-- that is what a legacy row must stay: it is treated as FULLY reversed for
-- whatever cumulative amount arrives, and only rows this function wrote (with
-- reversed_credits) can ever deduct a further delta. A legacy row's
-- deducted_credits is still its credits_delta, so the top-up netting is
-- unchanged.
--
-- Everything takes the same per-user advisory lock as reserve_mark_usage:
-- refunds, top-ups and reservations all move the balance.

-- ---------------------------------------------------------------------------
-- settle_prior_credit_refund: internal. Under the caller's lock, apply as much
-- of an order's outstanding reversal as a top-up of p_credits can absorb, and
-- return that amount (0 when there is no refund row for the order).
-- ---------------------------------------------------------------------------
create or replace function public.settle_prior_credit_refund(
  p_user_id uuid, p_order text, p_credits integer
) returns integer
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_row_id uuid;
  v_reversed integer;
  v_deducted integer;
  v_net integer;
begin
  if p_order is null or p_credits is null or p_credits <= 0 then
    return 0;
  end if;

  select id,
         coalesce((metadata->>'reversed_credits')::integer, -credits_delta),
         coalesce((metadata->>'deducted_credits')::integer, -credits_delta)
    into v_row_id, v_reversed, v_deducted
    from public.usage_events
   where event_type = 'credit_refund'
     and user_id = p_user_id
     and metadata->>'polar_order_id' = p_order
   for update;

  if v_row_id is null then
    return 0;
  end if;

  v_net := least(greatest(coalesce(v_reversed, 0) - coalesce(v_deducted, 0), 0), p_credits);
  if v_net <= 0 then
    return 0;
  end if;

  update public.usage_events
     set credits_delta = -(coalesce(v_deducted, 0) + v_net),
         metadata = metadata || jsonb_build_object(
           'deducted_credits', coalesce(v_deducted, 0) + v_net,
           'netted_at_topup', v_net
         )
   where id = v_row_id;

  return v_net;
end;
$$;

revoke all on function public.settle_prior_credit_refund(uuid, text, integer) from public;
revoke all on function public.settle_prior_credit_refund(uuid, text, integer) from anon, authenticated;
grant execute on function public.settle_prior_credit_refund(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- apply_credit_refund: p_credits is the CUMULATIVE number of credits this
-- order should have reversed by now. Returns what happened, for the webhook log.
-- Return type changes (void → jsonb), so the old function must be dropped.
-- ---------------------------------------------------------------------------
drop function if exists public.apply_credit_refund(uuid, integer, jsonb);

create function public.apply_credit_refund(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns jsonb
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_order text := p_metadata->>'polar_order_id';
  v_row_id uuid;
  v_reversed integer := 0;
  v_deducted integer := 0;
  v_balance integer;
  v_delta integer;
  v_take integer;
begin
  if p_credits is null or p_credits < 0 then
    raise exception 'apply_credit_refund: credits must be non-negative, got %', p_credits;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if v_order is not null then
    -- A row without reversed_credits predates this function: treat it as
    -- fully reversed for the incoming amount (see the header), never as
    -- "reversed exactly what it managed to deduct".
    select id,
           case
             when metadata ? 'reversed_credits' then (metadata->>'reversed_credits')::integer
             else greatest(-credits_delta, p_credits)
           end,
           coalesce((metadata->>'deducted_credits')::integer, -credits_delta)
      into v_row_id, v_reversed, v_deducted
      from public.usage_events
     where event_type = 'credit_refund'
       and user_id = p_user_id
       and metadata->>'polar_order_id' = v_order
     for update;
  end if;
  v_reversed := coalesce(v_reversed, 0);
  v_deducted := coalesce(v_deducted, 0);

  -- Only the part of the reversal we have not seen yet is new. A redelivery
  -- (same cumulative amount) is a no-op, exactly as the old key made it.
  v_delta := p_credits - v_reversed;
  if v_delta <= 0 then
    return jsonb_build_object(
      'reversed_now', 0, 'deducted_now', 0,
      'reversed_total', v_reversed, 'deducted_total', v_deducted
    );
  end if;

  select balance into v_balance
    from public.user_credits
   where user_id = p_user_id
   for update;
  -- Spent credits cannot be reclaimed; the balance floors at zero. The row
  -- still records the full reversal so a later top-up of the same order is
  -- net of it (see settle_prior_credit_refund).
  v_take := least(greatest(coalesce(v_balance, 0), 0), v_delta);

  if v_row_id is null then
    insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
    values (
      p_user_id, 'credit_refund', -v_take, 'credits',
      p_metadata || jsonb_build_object('reversed_credits', p_credits, 'deducted_credits', v_take)
    );
  else
    update public.usage_events
       set credits_delta = -(v_deducted + v_take),
           metadata = metadata || p_metadata || jsonb_build_object(
             'reversed_credits', p_credits,
             'deducted_credits', v_deducted + v_take
           )
     where id = v_row_id;
  end if;

  if v_take > 0 then
    update public.user_credits
       set balance = balance - v_take,
           updated_at = now()
     where user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'reversed_now', v_delta, 'deducted_now', v_take,
    'reversed_total', p_credits, 'deducted_total', v_deducted + v_take
  );
end;
$$;

comment on function public.apply_credit_refund(uuid, integer, jsonb) is
  'Reverse credits for a refunded order. p_credits is CUMULATIVE for metadata.polar_order_id; only the delta since the last call is deducted. Writes the ledger row even when the balance cannot cover it so a later top-up of the order is net of the refund.';

revoke all on function public.apply_credit_refund(uuid, integer, jsonb) from public;
revoke all on function public.apply_credit_refund(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.apply_credit_refund(uuid, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Top-ups: same signatures and return types as before (void / boolean), now
-- under the lock and net of a refund that got here first.
-- ---------------------------------------------------------------------------
create or replace function public.apply_credit_topup(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns void
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_grant integer;
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'apply_credit_topup: credits must be positive, got %', p_credits;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Ledger entry first, idempotent on the Polar order id. If this order's top-up
  -- is already recorded, the balance was already credited — do nothing.
  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_topup', p_credits, 'credits', p_metadata)
  on conflict (event_type, (metadata->>'polar_order_id'))
    where metadata ? 'polar_order_id'
    do nothing;

  if not found then
    return;
  end if;

  v_grant := p_credits - public.settle_prior_credit_refund(
    p_user_id, p_metadata->>'polar_order_id', p_credits
  );
  if v_grant <= 0 then
    return;
  end if;

  insert into public.user_credits (user_id, balance, total_purchased, updated_at)
  values (p_user_id, v_grant, v_grant, now())
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
        updated_at = now();
end;
$$;

revoke all on function public.apply_credit_topup(uuid, integer, jsonb) from public;
revoke all on function public.apply_credit_topup(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.apply_credit_topup(uuid, integer, jsonb) to service_role;

create or replace function public.try_apply_credit_topup(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns boolean
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_grant integer;
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'try_apply_credit_topup: credits must be positive, got %', p_credits;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_topup', p_credits, 'credits', p_metadata)
  on conflict (event_type, (metadata->>'polar_order_id'))
    where metadata ? 'polar_order_id'
    do nothing;

  if not found then
    return false;
  end if;

  v_grant := p_credits - public.settle_prior_credit_refund(
    p_user_id, p_metadata->>'polar_order_id', p_credits
  );
  if v_grant > 0 then
    insert into public.user_credits (user_id, balance, total_purchased, updated_at)
    values (p_user_id, v_grant, v_grant, now())
    on conflict (user_id) do update
      set balance = public.user_credits.balance + excluded.balance,
          total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
          updated_at = now();
  end if;

  -- "Applied" means this call owned the ledger row, whatever was left to grant
  -- after netting: the Max gift email keys on it and must still send once.
  return true;
end;
$$;

revoke all on function public.try_apply_credit_topup(uuid, integer, jsonb) from public;
revoke all on function public.try_apply_credit_topup(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.try_apply_credit_topup(uuid, integer, jsonb) to service_role;
