-- MarkScheme Creators (docs/CREATORS_PROGRAM.md).
--
-- Small study-tips creators get a space (/with/@handle), a code their followers
-- say or type, and a live count of the answers those followers get marked.
--
-- Attribution lives on the ATTEMPT (mark_runs.creator_code, attempts.creator_code),
-- not only on the account: most marking on the site is done by guests, and a
-- creator whose followers mark as guests must still be counted. The account
-- link (user_profiles.referred_by) is written once at signup by the service
-- role and pays the follower their gift marks.

create table if not exists public.creators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Spoken aloud in videos, so short, uppercase, no punctuation.
  code text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  status text not null default 'active' check (status in ('active', 'paused')),
  verified_at timestamptz not null default now(),
  verified_reason text,
  -- Cash rewards are 18+ only; set by hand from evidence, never self-declared.
  is_adult boolean not null default false,
  display_name text,
  tagline text,
  -- {"tiktok": "@handle", "instagram": "@handle", "youtube": "@handle"}
  links jsonb not null default '{}'::jsonb,
  -- Marks a follower receives for using the code, and the monthly pool that
  -- caps what one creator can hand out (each mark is 3-4 Gemini Pro calls).
  gift_marks integer not null default 5 check (gift_marks between 0 and 50),
  gift_pool_monthly integer not null default 200
    check (gift_pool_monthly between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.creators is
  'Verified creators (docs/CREATORS_PROGRAM.md). Service-role only; public reads go through lib/creators/service.ts, which exposes safe fields.';

alter table public.creators enable row level security;
revoke all on table public.creators from public, anon, authenticated;

-- One row per (creator, follower): the gift is paid once, and the row is the
-- lock that makes a double submit harmless.
create table if not exists public.creator_code_claims (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(user_id) on delete cascade,
  code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  marks_granted integer not null default 0,
  claimed_at timestamptz not null default now(),
  unique (creator_id, user_id)
);

alter table public.creator_code_claims enable row level security;
revoke all on table public.creator_code_claims from public, anon, authenticated;

create index if not exists creator_code_claims_creator_month_idx
  on public.creator_code_claims (creator_id, claimed_at desc);

-- The attempt-level attribution. mark_runs opens before the first model call,
-- so guest and failed runs count too; attempts carries it for the gap report.
alter table public.mark_runs add column if not exists creator_code text;
alter table public.attempts add column if not exists creator_code text;

create index if not exists mark_runs_creator_code_idx
  on public.mark_runs (creator_code, started_at desc)
  where creator_code is not null;
create index if not exists attempts_creator_code_idx
  on public.attempts (creator_code, created_at desc)
  where creator_code is not null;

-- Account-level attribution. user_profiles has no table-wide client
-- INSERT/UPDATE (20260807182215_user_profiles_column_grants.sql): a new column
-- is unwritable by clients unless granted by name, and these two are
-- deliberately not granted.
alter table public.user_profiles
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists referred_at timestamptz;

comment on column public.user_profiles.referred_by is
  'creators.user_id whose code or link this account signed up through. Service-role only.';

create index if not exists user_profiles_referred_by_idx
  on public.user_profiles (referred_by)
  where referred_by is not null;

-- Register the new protected columns and service-only tables. The body below
-- is copied from the latest definition (20260917_roadmap_v3.sql) with only
-- those additions — an older copy would drop allowlist entries.
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
    array['user_profiles', 'reputation',              'community standing'],
    array['user_profiles', 'referred_by',             'creator attribution, written once by the service role'],
    array['user_profiles', 'referred_at',             'when that attribution was written']
  ];
  service_only constant text[] := array[
    'visit_sessions',
    'outreach_targets',
    'teacher_seat_requests',
    'study_plans',
    'study_plan_events',
    'creators',
    'creator_code_claims'
  ];
  -- Each entry is either (a) a function that MUST be callable by a signed-in
  -- user and that enforces its own auth.uid() ownership check, or (b) an
  -- aggregate read over public data whose caller-specific fields are empty
  -- for anon. Adding a name here is a security decision: read the body
  -- first, and say which of the two it is.
  rpc_allowlist constant text[] := array[
    -- (a) ownership-checked, signed-in only
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids',
    'dm_open_thread',
    'dm_inbox',
    'dm_mark_read',
    'dm_is_blocked',
    'create_poll',
    'vote_poll',
    'set_user_flair',
    -- (b) aggregate public reads (20260916_community_rpc_allowlist.sql)
    'get_poll',
    'get_reactions',
    'get_follow_stats'
  ];
  i integer;
begin
  -- A table-wide INSERT/UPDATE makes every column restriction on that table
  -- unenforceable, however the role came by it.
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'table-grant'::text,
             format(
               '%s: %s holds a table-wide %s grant (possibly via PUBLIC), which makes every column restriction on this table unenforceable',
               protected[i][1], r.rolname, p.priv
             )
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and has_table_privilege(r.rolname, 'public.' || protected[i][1], p.priv);
  end loop;

  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'column'::text,
             format('%s.%s: %s can %s it (possibly via PUBLIC) — %s',
                    protected[i][1], protected[i][2], r.rolname, p.priv, protected[i][3])
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and exists (
           select 1 from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = protected[i][1]
              and c.column_name = protected[i][2]
         )
         and has_column_privilege(
               r.rolname, 'public.' || protected[i][1], protected[i][2], p.priv
             );
  end loop;

  -- Service-role-only tables: any client reachability at all is a violation.
  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table (possibly via PUBLIC)',
                  t.name, r.rolname, p.priv)
      from unnest(service_only) as t(name)
     cross join unnest(client_roles) as r(rolname)
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(priv)
     where to_regclass('public.' || t.name) is not null
       and has_table_privilege(r.rolname, 'public.' || t.name, p.priv);

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

revoke execute on function public.audit_client_grants() from public;
revoke execute on function public.audit_client_grants() from anon, authenticated;
