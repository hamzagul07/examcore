-- Read new signups in a time window for the daily digest. SECURITY DEFINER so
-- it can read auth.users (not exposed via PostgREST); locked to the service role.
create or replace function public.signups_between(
  p_start timestamptz,
  p_end timestamptz
)
returns table (id uuid, email text, created_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text, u.created_at
  from auth.users u
  where u.created_at >= p_start and u.created_at < p_end
  order by u.created_at asc
$$;

revoke all on function public.signups_between(timestamptz, timestamptz) from public;
revoke all on function public.signups_between(timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.signups_between(timestamptz, timestamptz) to service_role;
