-- Sprint 44: Four subscription tiers + Omni message metering

-- ---------------------------------------------------------------------------
-- user_subscriptions: unlimited -> mastery, add scholar
-- ---------------------------------------------------------------------------
update public.user_subscriptions
set tier = 'mastery'
where tier = 'unlimited';

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_tier_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_tier_check
  check (tier in ('free', 'student', 'scholar', 'mastery'));

-- ---------------------------------------------------------------------------
-- usage_events: allow omni_message event type
-- ---------------------------------------------------------------------------
alter table public.usage_events
  drop constraint if exists usage_events_event_type_check;

alter table public.usage_events
  add constraint usage_events_event_type_check
  check (event_type in (
    'mark_single',
    'mark_whole_paper',
    'omni_message',
    'credit_topup',
    'credit_grant'
  ));

-- ---------------------------------------------------------------------------
-- consume_credit: credits spend on marks OR Omni messages
-- ---------------------------------------------------------------------------
create or replace function public.consume_credit(
  p_user_id uuid,
  p_event_type text,
  p_attempt_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_event_type not in ('mark_single', 'mark_whole_paper', 'omni_message') then
    raise exception 'consume_credit: invalid event_type %', p_event_type;
  end if;

  update public.user_credits
    set balance = balance - 1,
        total_used = total_used + 1,
        updated_at = now()
    where user_id = p_user_id and balance >= 1;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return false;
  end if;

  insert into public.usage_events (user_id, event_type, attempt_id, credits_delta, source, metadata)
  values (p_user_id, p_event_type, p_attempt_id, -1, 'credits', p_metadata);

  return true;
end;
$$;

revoke all on function public.consume_credit(uuid, text, uuid, jsonb) from public;
revoke all on function public.consume_credit(uuid, text, uuid, jsonb) from anon, authenticated;
grant execute on function public.consume_credit(uuid, text, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- pricing_config: deactivate legacy unlimited rows (Stripe products remain)
-- ---------------------------------------------------------------------------
update public.pricing_config
set is_active = false
where product_key = 'unlimited';
