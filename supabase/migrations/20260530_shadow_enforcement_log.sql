-- Sprint 43: Soft-launch enforcement
-- Shadow log records "would have been blocked/warned" events so we can watch
-- real usage in `off` mode before flipping enforcement on. Plus consume_credit
-- for the atomic credit-spend path (subscriber over cap, free user using credits).

create table if not exists public.shadow_enforcement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null check (event_type in ('would_warn', 'would_block', 'allowed_via_credits')),
  reason text,  -- 'free_tier_cap' | 'student_cap' | 'subscription_inactive' | null
  tier text not null,
  marks_used integer not null,
  mark_cap integer not null,
  credit_balance integer not null,
  enforcement_mode text not null,  -- mode at time of event
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_shadow_log_user_created
  on public.shadow_enforcement_log (user_id, created_at desc);
create index if not exists idx_shadow_log_created
  on public.shadow_enforcement_log (created_at desc);
create index if not exists idx_shadow_log_type_created
  on public.shadow_enforcement_log (event_type, created_at desc);

-- Service role only: RLS enabled, zero policies (anon/authenticated blocked).
alter table public.shadow_enforcement_log enable row level security;

-- ---------------------------------------------------------------------------
-- Atomic credit consumption (mirrors apply_credit_topup)
-- ---------------------------------------------------------------------------
-- Decrements balance by 1 + bumps total_used + logs a usage_events row, all in
-- one transaction. Guards balance >= 1 so we never go negative (also enforced
-- by the user_credits.balance >= 0 check constraint). Returns true if a credit
-- was spent, false if the user had none.
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
  if p_event_type not in ('mark_single', 'mark_whole_paper') then
    raise exception 'consume_credit: invalid event_type %', p_event_type;
  end if;

  update public.user_credits
    set balance = balance - 1,
        total_used = total_used + 1,
        updated_at = now()
    where user_id = p_user_id and balance >= 1;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return false; -- no credits to spend
  end if;

  insert into public.usage_events (user_id, event_type, attempt_id, credits_delta, source, metadata)
  values (p_user_id, p_event_type, p_attempt_id, -1, 'credits', p_metadata);

  return true;
end;
$$;

revoke all on function public.consume_credit(uuid, text, uuid, jsonb) from public;
revoke all on function public.consume_credit(uuid, text, uuid, jsonb) from anon, authenticated;
grant execute on function public.consume_credit(uuid, text, uuid, jsonb) to service_role;
