-- Study plans: one per student, built from their exam date, preparedness and
-- weekday commitments (lib/plan/build-study-plan.ts), hydrated into real
-- questions (lib/plan/study-plan-service.ts) and stored whole so the page,
-- the dashboard card and the morning check-in all read the same days.
--
-- Written only through the service client from /api/plan; the check-in cron
-- reads it. Service-role-only like teacher_seat_requests: RLS on with no
-- policies, the default client grants revoked, and listed in
-- audit_client_grants() so `pnpm test:grants` notices if that ever regresses.

create table if not exists public.study_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exam_date date not null,
  preparedness text not null check (preparedness in ('pass', 'secure', 'stretch')),
  minutes_per_day integer not null check (minutes_per_day between 0 and 600),
  -- Minutes available Monday..Sunday, as the student set them.
  availability jsonb not null default '[]'::jsonb,
  -- [{code, label}] the plan rotates through.
  subjects jsonb not null default '[]'::jsonb,
  -- The hydrated plan (HydratedPlan): days, blocks, links, headline.
  plan jsonb not null,
  -- {"<day number>": true} for days the student ticked off.
  done_days jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Dedupe for the daily check-in email (see lib/plan/checkin.ts).
  checkin_last_sent_at timestamptz
);

comment on table public.study_plans is
  'One day-by-day revision plan per student. Service-role only; see lib/plan/.';

-- The check-in cron scans by exam date each morning.
create index if not exists study_plans_exam_date_idx
  on public.study_plans (exam_date);

alter table public.study_plans enable row level security;
revoke all on table public.study_plans from anon, authenticated;

-- Add study_plans to the service-only list. The function body is otherwise
-- unchanged from 20260907_dm_rpc_allowlist.sql.
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
  service_only constant text[] := array[
    'visit_sessions',
    'outreach_targets',
    'teacher_seat_requests',
    'study_plans'
  ];
  -- Each entry is a function that MUST be callable by a signed-in user and that
  -- enforces its own auth.uid() ownership check. Adding a name here is a
  -- security decision: read the body first.
  rpc_allowlist constant text[] := array[
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids',
    'dm_open_thread',
    'dm_inbox',
    'dm_mark_read',
    'dm_is_blocked'
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
