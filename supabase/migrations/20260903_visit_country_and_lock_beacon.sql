-- Two fixes to the visit beacon: where our users are, and who may write to it.
--
-- ---------------------------------------------------------------------------
-- 1. Country, because every pricing decision so far has been guesswork
-- ---------------------------------------------------------------------------
--
-- Nothing in the database records where anyone is. The conversion diagnosis
-- concluded "don't cut the price yet — you have no evidence price is the
-- objection", and that was correct *because the evidence did not exist*.
--
-- What can be inferred without it is already suggestive. Session volume by UTC
-- hour over 30 days peaks at 05:00 UTC and troughs 20:00-23:00 UTC. A US or
-- European audience troughs at 06:00-10:00 UTC — the exact hour that is our
-- peak — so the bulk of this traffic sits somewhere around UTC+4 to UTC+8.
-- Against a single worldwide USD price of $19.99/month, that is a question
-- worth answering properly rather than inferring from a histogram.
--
-- Country only: no IP is stored, and a country code is the coarsest signal that
-- can answer it. Vercel supplies it on the request at no cost, so this needs no
-- analytics vendor and no client-side change.
--
-- On visit_sessions rather than page_events: one row per session instead of one
-- per pageview, and the question is about people, not pages.
alter table public.visit_sessions
  add column if not exists country text;

comment on column public.visit_sessions.country is
  'ISO 3166-1 alpha-2 from the edge (x-vercel-ip-country). Coarse by design — no IP is retained.';

-- ---------------------------------------------------------------------------
-- 2. Lock the beacon to the service role
-- ---------------------------------------------------------------------------
--
-- record_page_event is SECURITY DEFINER and its only caller is app/api/track,
-- which uses the service client. Every migration that touched it since
-- 20260722 tried to lock it down and none succeeded:
--
--     revoke all on function public.record_page_event(...) from anon, authenticated;
--
-- `create or replace` re-grants EXECUTE to PUBLIC every time, and revoking from
-- a named role does not subtract from PUBLIC. Confirmed live before this ran:
-- proacl was {=X/postgres,...} and has_function_privilege('anon', …) was true.
--
-- So anyone holding the publishable anon key — it ships in the browser bundle —
-- could write arbitrary rows into page_events and visit_sessions. No data leaks
-- that way, but it is the measurement layer the entire funnel is read from, and
-- forged rows are worse than missing ones: they are indistinguishable from real
-- ones and they move decisions.
--
-- The signature changes anyway to take p_country, so the old one is dropped
-- outright rather than left as a callable overload.
drop function if exists public.record_page_event(
  text, text, uuid, text, integer, text, text, text, text, text, integer
);

create function public.record_page_event(
  p_session_id  text,
  p_path        text,
  p_user_id     uuid    default null,
  p_referrer    text    default null,
  p_dwell_ms    integer default 0,
  p_utm_source  text    default null,
  p_utm_medium  text    default null,
  p_utm_campaign text   default null,
  p_utm_content text    default null,
  p_utm_term    text    default null,
  p_session_cap integer default 300,
  p_country     text    default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count   integer;
  v_host    text;
  v_country text;
begin
  if p_session_id is null or length(p_session_id) < 8 then
    return false;
  end if;

  select count(*) into v_count
    from public.page_events
   where session_id = p_session_id
     and created_at >= date_trunc('day', now());

  if v_count >= p_session_cap then
    return false;
  end if;

  v_host := nullif(lower(split_part(split_part(regexp_replace(coalesce(p_referrer, ''), '^https?://', ''), '/', 1), ':', 1)), '');

  -- Two letters or nothing. The header is attacker-controllable in principle,
  -- so it is shape-checked here as well as at the route.
  v_country := nullif(upper(substring(coalesce(p_country, '') from '^[A-Za-z]{2}$')), '');

  insert into public.visit_sessions as vs (
    session_id, landing_path, referrer, referrer_host,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    channel, user_id, converted_at, pageviews, country
  )
  values (
    p_session_id, p_path, nullif(p_referrer, ''), v_host,
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    public.classify_channel(v_host, p_utm_source, p_utm_medium),
    p_user_id,
    case when p_user_id is not null then now() else null end,
    1,
    v_country
  )
  on conflict (session_id) do update set
    last_seen_at = now(),
    pageviews    = vs.pageviews + 1,
    user_id      = coalesce(vs.user_id, excluded.user_id),
    -- First reading wins: a later pageview behind a VPN must not rewrite where
    -- the session began.
    country      = coalesce(vs.country, excluded.country),
    converted_at = case
                     when vs.user_id is null and excluded.user_id is not null then now()
                     else vs.converted_at
                   end;

  insert into public.page_events (user_id, session_id, path, referrer, dwell_ms)
  values (p_user_id, p_session_id, p_path, p_referrer, greatest(0, coalesce(p_dwell_ms, 0)));

  return true;
end;
$$;

revoke execute on function public.record_page_event(
  text, text, uuid, text, integer, text, text, text, text, text, integer, text
) from public;
revoke execute on function public.record_page_event(
  text, text, uuid, text, integer, text, text, text, text, text, integer, text
) from anon, authenticated;
grant execute on function public.record_page_event(
  text, text, uuid, text, integer, text, text, text, text, text, integer, text
) to service_role;

comment on function public.record_page_event is
  'Service-role only. Called by app/api/track; the browser never reaches it directly.';

-- ---------------------------------------------------------------------------
-- 3. Drop record_page_event from the grants allowlist
-- ---------------------------------------------------------------------------
--
-- 20260902 allowlisted it as "the analytics beacon; anon by design". That was
-- wrong: its only caller has always used the service client, and the PUBLIC
-- grant above was an accident that four migrations tried and failed to remove.
-- With it revoked, the allowlist entry would hide a regression rather than
-- describe an intention.
create or replace function public.audit_client_grants()
returns table(severity text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  client_roles constant text[] := array['anon', 'authenticated'];
  protected constant text[][] := array[
    array['user_profiles', 'role',                    'gates the whole /teacher surface'],
    array['user_profiles', 'teacher_verified_at',     'grants the free teacher allowance'],
    array['user_profiles', 'teacher_verified_reason', 'the audit trail for that grant'],
    array['user_profiles', 'reputation',              'community standing']
  ];
  service_only constant text[] := array['visit_sessions', 'outreach_targets'];
  -- Called from inside RLS policies, so the signed-in caller must be able to
  -- execute them for their own reads to work. Everything else in `public` that
  -- is SECURITY DEFINER is server-only.
  rpc_allowlist constant text[] := array[
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids'
  ];
  i integer;
begin
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'table-grant'::text,
             format(
               '%s: %s holds a table-wide %s grant, which makes every column restriction on this table unenforceable',
               tp.table_name, tp.grantee, tp.privilege_type
             )
        from information_schema.table_privileges tp
       where tp.table_schema = 'public'
         and tp.table_name = protected[i][1]
         and tp.grantee = any(client_roles)
         and tp.privilege_type in ('INSERT', 'UPDATE');
  end loop;

  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'column'::text,
             format(
               '%s.%s: %s can %s it — %s',
               cp.table_name, cp.column_name, cp.grantee, cp.privilege_type, protected[i][3]
             )
        from information_schema.column_privileges cp
       where cp.table_schema = 'public'
         and cp.table_name = protected[i][1]
         and cp.column_name = protected[i][2]
         and cp.grantee = any(client_roles)
         and cp.privilege_type in ('INSERT', 'UPDATE');
  end loop;

  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table',
                  tp.table_name, tp.grantee, tp.privilege_type)
      from information_schema.table_privileges tp
     where tp.table_schema = 'public'
       and tp.table_name = any(service_only)
       and tp.grantee = any(client_roles);

  return query
    select 'security-definer-rpc'::text,
           format(
             '%s(%s): %s can execute this SECURITY DEFINER function — it runs as the owner and bypasses RLS. Revoke FROM PUBLIC (revoking from the role alone is a no-op), or add it to rpc_allowlist.',
             p.proname, pg_get_function_identity_arguments(p.oid), r.rolname
           )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     cross join unnest(client_roles) as r(rolname)
     where n.nspname = 'public'
       and p.prosecdef
       and not (p.proname = any(rpc_allowlist))
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
end;
$$;
