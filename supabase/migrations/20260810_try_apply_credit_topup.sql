-- Return whether a credit top-up newly applied, so Max gifts can email once.
-- apply_credit_topup stays void for existing Polar credit-pack callers.

create or replace function public.try_apply_credit_topup(
  p_user_id uuid, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns boolean
  language plpgsql security definer set search_path to 'public'
as $$
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'try_apply_credit_topup: credits must be positive, got %', p_credits;
  end if;

  insert into public.usage_events (user_id, event_type, credits_delta, source, metadata)
  values (p_user_id, 'credit_topup', p_credits, 'credits', p_metadata)
  on conflict (event_type, (metadata->>'polar_order_id'))
    where metadata ? 'polar_order_id'
    do nothing;

  if not found then
    return false;
  end if;

  insert into public.user_credits (user_id, balance, total_purchased, updated_at)
  values (p_user_id, p_credits, p_credits, now())
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.try_apply_credit_topup(uuid, integer, jsonb) from public;
revoke all on function public.try_apply_credit_topup(uuid, integer, jsonb) from anon, authenticated;
grant execute on function public.try_apply_credit_topup(uuid, integer, jsonb) to service_role;
