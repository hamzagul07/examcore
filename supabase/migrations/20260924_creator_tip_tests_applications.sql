-- Creators: tip tests and applications (docs/CREATORS_PROGRAM.md).
--
-- A tip test is a creator's tip turned into a marked question: "define the
-- command word first" attached to a real question, so followers can try the
-- tip and the creator can see whether it works (average score, full marks).
-- Attempts and runs carry tip_test_id the same way they carry creator_code.
--
-- Applications replace the mailto: a creator asks in-product, the founder
-- approves in /admin/creators, and the seat is granted through the same
-- code path the CLI uses (lib/creators/grant.ts).

create table if not exists public.creator_tip_tests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(user_id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null check (char_length(title) between 4 and 90),
  tip text not null check (char_length(tip) between 10 and 600),
  subject_code text not null,
  question_text text not null check (char_length(question_text) between 10 and 4000),
  total_marks integer not null check (total_marks between 1 and 50),
  source_question_id uuid references public.extracted_questions(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

alter table public.creator_tip_tests enable row level security;
revoke all on table public.creator_tip_tests from public, anon, authenticated;

create index if not exists creator_tip_tests_creator_idx
  on public.creator_tip_tests (creator_id, created_at desc);

alter table public.attempts
  add column if not exists tip_test_id uuid references public.creator_tip_tests(id) on delete set null;
alter table public.mark_runs add column if not exists tip_test_id uuid;

create index if not exists attempts_tip_test_idx
  on public.attempts (tip_test_id) where tip_test_id is not null;

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  handle_wanted text not null check (handle_wanted ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  tagline text check (tagline is null or char_length(tagline) <= 160),
  tiktok text,
  instagram text,
  youtube text,
  exams text,
  audience_size text,
  -- Self-declared here; the reviewer sets creators.is_adult from evidence.
  is_adult boolean not null default false,
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  reviewed_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists creator_applications_one_pending_uidx
  on public.creator_applications (user_id) where status = 'pending';
create index if not exists creator_applications_status_idx
  on public.creator_applications (status, created_at desc);

alter table public.creator_applications enable row level security;
revoke all on table public.creator_applications from public, anon, authenticated;

-- Register both as service-only. Body copied from the latest definition
-- (20260923d_creator_brief_conversions.sql) with only those additions.
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
    'creator_code_claims',
    'creator_conversions',
    'creator_tip_tests',
    'creator_applications'
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
