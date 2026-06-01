-- Pass 17: lock down signups, service-only tables, and classroom RPC helpers

-- Waitlist signups: API (service role) only — drop open client insert
drop policy if exists public_insert on public.signups;

drop policy if exists signups_deny_client on public.signups;
create policy signups_deny_client
  on public.signups
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- Service-only tables: explicit deny for client roles (service role bypasses RLS)
drop policy if exists mark_schemes_service_only on public.mark_schemes;
create policy mark_schemes_service_only
  on public.mark_schemes
  for all
  to authenticated, anon
  using (false)
  with check (false);

drop policy if exists pricing_config_service_only on public.pricing_config;
create policy pricing_config_service_only
  on public.pricing_config
  for all
  to authenticated, anon
  using (false)
  with check (false);

drop policy if exists rate_limits_service_only on public.rate_limits;
create policy rate_limits_service_only
  on public.rate_limits
  for all
  to authenticated, anon
  using (false)
  with check (false);

drop policy if exists shadow_enforcement_log_service_only on public.shadow_enforcement_log;
create policy shadow_enforcement_log_service_only
  on public.shadow_enforcement_log
  for all
  to authenticated, anon
  using (false)
  with check (false);

drop policy if exists stripe_webhook_events_service_only on public.stripe_webhook_events;
create policy stripe_webhook_events_service_only
  on public.stripe_webhook_events
  for all
  to authenticated, anon
  using (false)
  with check (false);

alter table public.rate_limits
  add column if not exists signup_count integer not null default 0;

-- Classroom ID helpers: RLS internals only, not client RPC
revoke all on function public.teacher_classroom_ids(uuid) from public;
revoke all on function public.teacher_student_ids(uuid) from public;
revoke all on function public.user_classroom_ids(uuid) from public;

revoke all on function public.teacher_classroom_ids(uuid) from anon, authenticated;
revoke all on function public.teacher_student_ids(uuid) from anon, authenticated;
revoke all on function public.user_classroom_ids(uuid) from anon, authenticated;

grant execute on function public.teacher_classroom_ids(uuid) to service_role;
grant execute on function public.teacher_student_ids(uuid) to service_role;
grant execute on function public.user_classroom_ids(uuid) to service_role;
