-- Credit refund clawback for Polar `order.refunded` on one-time credit packs.
-- Mirrors apply_credit_topup but subtracts, floored at 0 (spent credits can't be
-- reclaimed). Logs an auditable usage_events row (new 'credit_refund' type).

-- Allow the new event type.
alter table public.usage_events drop constraint usage_events_event_type_check;
alter table public.usage_events
  add constraint usage_events_event_type_check
  check (event_type = any (array[
    'mark_single', 'mark_whole_paper', 'omni_message',
    'credit_topup', 'credit_grant', 'credit_refund'
  ]));

create or replace function public.apply_credit_refund(
  p_user_id uuid,
  p_credits integer,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
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
    return; -- no credits row → nothing to claw back
  end if;

  v_deducted := least(v_balance, p_credits);
  if v_deducted <= 0 then
    return;
  end if;

  update public.user_credits
    set balance = balance - v_deducted,
        updated_at = now()
  where user_id = p_user_id;

  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_refund', -v_deducted, 'credits', p_metadata);
end;
$$;

revoke all on function public.apply_credit_refund(uuid, integer, jsonb) from public;
revoke all on function public.apply_credit_refund(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.apply_credit_refund(uuid, integer, jsonb) to service_role;
