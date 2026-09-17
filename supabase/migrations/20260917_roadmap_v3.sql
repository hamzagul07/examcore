-- The study plan grows into the Exam Roadmap (docs/EXAM_ROADMAP.md §3).
--
-- Every change here is additive so the plans built yesterday keep working:
-- the dashboard card, the check-in email, the .ics feed and PATCH {day, done}
-- read v2 and v3 rows alike. The v3 engine adds a strategy (the mode the
-- copy uses), a revision (so a client acting on a stale plan gets a 409, not
-- a silent overwrite), per-task state beside the day ticks, the topic pools
-- a replan draws from, a single-level undo snapshot, a materialised today
-- summary for the lesson page and notifications, the date the lazy rollover
-- last ran for, and the reminder preferences the wizard collects.
--
-- The preparedness check is NOT widened. A v3 plan stores the legacy code
-- beside `strategy` (lib/plan/modes.ts), so nothing that reads preparedness
-- has to learn the new names.
--
-- study_plan_events is the per-task record: started, completed, skipped,
-- replanned, with planned and actual minutes. Written only from the plan
-- routes after the plan update has landed. Service-role only like
-- study_plans, and listed in audit_client_grants() so `pnpm test:grants`
-- notices if a client grant ever creeps back.

alter table public.study_plans
  add column if not exists strategy text check (strategy in ('foundation', 'balanced', 'polish')),
  add column if not exists algorithm_version integer,
  add column if not exists revision integer not null default 1,
  add column if not exists feasibility_state text,
  add column if not exists input_snapshot jsonb,
  add column if not exists task_state jsonb not null default '{}'::jsonb,
  add column if not exists pools jsonb,
  add column if not exists undo jsonb,
  add column if not exists today_summary jsonb,
  add column if not exists last_rolled_date date,
  add column if not exists reminder_time text,
  add column if not exists quiet_hours jsonb,
  add column if not exists notify_backoff integer not null default 0,
  add column if not exists checkins_unopened integer not null default 0;

comment on column public.study_plans.strategy is
  'The roadmap mode (foundation | balanced | polish). preparedness keeps the legacy code beside it.';
comment on column public.study_plans.algorithm_version is
  'PLAN_VERSION of the engine that built the plan; 3 for the roadmap. Older plans are offered a rebuild.';
comment on column public.study_plans.revision is
  'Bumped on every change to the plan''s blocks. Task, replan and undo requests carry it and get a 409 on mismatch.';
comment on column public.study_plans.feasibility_state is
  'on_track | focused | tight from the last build, for plan:report.';
comment on column public.study_plans.input_snapshot is
  'The RoadmapBuildRequest the plan was built from, so a rebuild can start from the same answers.';
comment on column public.study_plans.task_state is
  '{"<task id>": TaskStateEntry} — started, done, skipped, deferred, shortened, swapped, with check-in feel and actual minutes.';
comment on column public.study_plans.pools is
  'TopicPriority[] per subject code. Read only by replan, swap and rollover on the server; never sent to the client whole.';
comment on column public.study_plans.undo is
  'One day''s snapshot (UndoSnapshot, ~5 KB) for one-tap undo after a replan, rollover or check-in effect.';
comment on column public.study_plans.today_summary is
  'RoadmapTodaySummary materialised on every write; GET /api/plan/today serves it when its date is today.';
comment on column public.study_plans.last_rolled_date is
  'The last date the lazy rollover ran for; it runs once per date, on the next read after midnight in the plan''s zone.';
comment on column public.study_plans.reminder_time is
  'HH:MM in the plan''s zone: when the morning check-in should arrive. Null means the legacy 07:00–11:00 window.';
comment on column public.study_plans.quiet_hours is
  '{"start": "HH:MM", "end": "HH:MM"}; no notification is sent inside it. May cross midnight.';
comment on column public.study_plans.notify_backoff is
  'Reserved for a per-student backoff override; the schedule itself is derived from checkins_unopened.';
comment on column public.study_plans.checkins_unopened is
  'Check-ins sent since the plan page was last opened from one (?src=checkin). Drives the backoff: 3+ every other day, 6+ weekly.';

create table if not exists public.study_plan_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  event_type text not null,
  -- Denormalised from the task so the report never has to open the plan JSON.
  subject_code text,
  topic_code text,
  task_type text,
  plan_generated_at timestamptz,
  planned_minutes integer,
  actual_minutes integer,
  feel text,
  reason text,
  revision integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.study_plan_events is
  'Per-task roadmap events (started, completed, skipped, replanned, undone) with planned vs actual minutes. Service-role only; see lib/plan/events.ts.';

create index if not exists study_plan_events_user_created_idx
  on public.study_plan_events (user_id, created_at desc);

alter table public.study_plan_events enable row level security;
revoke all on table public.study_plan_events from anon, authenticated;
-- The bigserial's sequence is client-reachable by default; nothing a client
-- should be able to advance.
revoke all on sequence public.study_plan_events_id_seq from anon, authenticated;

-- Add study_plan_events to the service-only list. The function body is
-- otherwise unchanged from 20260916_community_rpc_allowlist.sql, the latest
-- definition — copying an older one here would silently drop the community
-- RPCs from the allowlist and turn `pnpm test:grants` red on a non-change.
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
    'study_plans',
    'study_plan_events'
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
