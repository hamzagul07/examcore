-- Teacher system v2, part 3 of 3: review decisions, written feedback, the
-- teacher audit log, email preferences, and the grants audit that covers all
-- three files. (docs/TEACHER_SYSTEM_SPEC.md §1.3, §6, §8)
--
--   teacher_overrides   gains a decision (confirm / override / flag), a
--                       student_visible switch, a supersedes chain (so the
--                       first AI snapshot survives a second override), the
--                       classroom it was made from, and a short note. The
--                       teacher policy's WITH CHECK is narrowed to attempts of
--                       the teacher's CURRENT students; it used to accept any
--                       attempt id at all.
--   teacher_feedback    a note on one attempt, from teacher to student. The
--                       student marks it read through an RPC; nobody UPDATEs it.
--   teacher_audit_log   who looked at / exported / changed what about which
--                       student. Service-role only and append-only.
--   user_profiles       two email preferences the student and teacher control,
--                       and the digest cron's double-send guard, which they
--                       must not.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- teacher_overrides
-- ---------------------------------------------------------------------------
alter table public.teacher_overrides
  add column if not exists decision text not null default 'override'
    check (decision in ('confirm', 'override', 'flag')),
  add column if not exists student_visible boolean not null default true,
  -- ON DELETE SET NULL, not the default NO ACTION: overrides cascade away with
  -- their teacher's account, and a later override by a DIFFERENT teacher that
  -- supersedes one of them would otherwise block that account deletion.
  add column if not exists supersedes_override_id uuid
    references public.teacher_overrides (id) on delete set null,
  add column if not exists classroom_id uuid
    references public.classrooms (id) on delete set null,
  add column if not exists reasoning_note text check (length(reasoning_note) <= 1000);

comment on column public.teacher_overrides.decision is
  'confirm = the AI mark stands; override = marks changed (attempts updated); flag = needs another look. Existing rows are overrides.';
comment on column public.teacher_overrides.student_visible is
  'When false the row is invisible to the student (override_student_read) and no notification is sent.';
comment on column public.teacher_overrides.supersedes_override_id is
  'The previous decision on the same attempt. The earliest row''s original_marks_awarded is the AI snapshot every later decision is measured against.';
comment on column public.teacher_overrides.classroom_id is
  'The class the decision was made from, for filtering the review queue.';
comment on column public.teacher_overrides.reasoning_note is
  'Plain-text note to the student (stripRawHtml on write), at most 1000 characters.';

create index if not exists teacher_overrides_attempt_created_idx
  on public.teacher_overrides (attempt_id, created_at);
create index if not exists teacher_overrides_classroom_idx
  on public.teacher_overrides (classroom_id)
  where classroom_id is not null;
create index if not exists teacher_overrides_supersedes_idx
  on public.teacher_overrides (supersedes_override_id)
  where supersedes_override_id is not null;

drop policy if exists override_teacher_access on public.teacher_overrides;
create policy override_teacher_access on public.teacher_overrides
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and attempt_id in (
      select a.id
        from public.attempts a
       where a.user_id in (select public.teacher_student_ids((select auth.uid())))
    )
  );

drop policy if exists override_student_read on public.teacher_overrides;
create policy override_student_read on public.teacher_overrides
  for select
  to authenticated
  using (
    student_visible
    and attempt_id in (select a.id from public.attempts a where a.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- teacher_feedback
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.teacher_feedback is
  'A teacher''s note to a student on one attempt. Teachers insert and delete (an edit is delete + insert); the student reads it and marks it read via mark_teacher_feedback_read().';
comment on column public.teacher_feedback.body is
  'Plain text (stripRawHtml on write), 1–2000 characters; rendered without raw HTML.';
comment on column public.teacher_feedback.read_at is
  'Set once by mark_teacher_feedback_read() when the student opens it. No client role holds UPDATE on this table.';

create index if not exists teacher_feedback_attempt_idx
  on public.teacher_feedback (attempt_id);
create index if not exists teacher_feedback_unread_idx
  on public.teacher_feedback (student_id)
  where read_at is null;
-- The two FK columns without an index of their own: account deletion cascades
-- through them, and the teacher's and student's own feed reads use them.
create index if not exists teacher_feedback_student_idx
  on public.teacher_feedback (student_id, created_at desc);
create index if not exists teacher_feedback_teacher_idx
  on public.teacher_feedback (teacher_id, created_at desc);
create index if not exists teacher_feedback_classroom_idx
  on public.teacher_feedback (classroom_id)
  where classroom_id is not null;

alter table public.teacher_feedback enable row level security;

-- WITH CHECK also ties the attempt to the student named on the row. Without
-- it a teacher could file a note "on" an attempt that is not that student's,
-- which the student would be notified about and could never open.
drop policy if exists feedback_teacher_manage on public.teacher_feedback;
create policy feedback_teacher_manage on public.teacher_feedback
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and student_id in (select public.teacher_student_ids((select auth.uid())))
    and exists (
      select 1 from public.attempts a
       where a.id = teacher_feedback.attempt_id
         and a.user_id = teacher_feedback.student_id
    )
    and (
      classroom_id is null
      or classroom_id in (select c.id from public.classrooms c where c.teacher_id = (select auth.uid()))
    )
  );

drop policy if exists feedback_student_read on public.teacher_feedback;
create policy feedback_student_read on public.teacher_feedback
  for select
  to authenticated
  using (student_id = (select auth.uid()));

-- read_at is only ever set through the RPC below, and teachers edit by
-- delete + insert, so no client role needs UPDATE here. audit_client_grants()
-- lists the table under update_service_only so a regrant is caught.
revoke all on public.teacher_feedback from anon;
revoke update on public.teacher_feedback from public, authenticated;
grant all on public.teacher_feedback to service_role;

create or replace function public.mark_teacher_feedback_read(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.teacher_feedback
     set read_at = now()
   where id = any(p_ids)
     and student_id = auth.uid()
     and read_at is null
$$;

revoke all on function public.mark_teacher_feedback_read(uuid[]) from public, anon;
grant execute on function public.mark_teacher_feedback_read(uuid[]) to authenticated, service_role;

comment on function public.mark_teacher_feedback_read(uuid[]) is
  'Marks the caller''s own unread feedback rows among p_ids as read. Ids belonging to anyone else are ignored.';

-- ---------------------------------------------------------------------------
-- teacher_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  classroom_id uuid,
  student_id uuid,
  action text not null check (action in (
    'view_student', 'export_csv', 'override', 'feedback', 'remove_student',
    'regenerate_code', 'archive_classroom', 'delete_classroom'
  )),
  meta jsonb check (meta is null or jsonb_typeof(meta) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.teacher_audit_log is
  'Append-only record of teacher actions that touch a student''s data or a class''s membership. Written by lib/teacher/notify.ts auditLog() with the service role; included in the student''s privacy export for rows about them. No foreign keys on purpose: an audit row must outlive the accounts and classrooms it names.';

create index if not exists teacher_audit_student_idx
  on public.teacher_audit_log (student_id, created_at);

alter table public.teacher_audit_log enable row level security;

-- Service-role only (no policies, no client grants), and append-only for the
-- application as well: service_role may read, insert, and delete (account
-- erasure, retention), but not rewrite history. Supabase's default privileges
-- hand out ALL on create, so everything is taken back explicitly.
revoke all on public.teacher_audit_log from public, anon, authenticated;
revoke all on sequence public.teacher_audit_log_id_seq from public, anon, authenticated;
grant select, insert, delete on public.teacher_audit_log to service_role;
revoke update, truncate on public.teacher_audit_log from service_role;
grant usage on sequence public.teacher_audit_log_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- user_profiles: email preferences + the digest guard
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists teacher_digest_last_sent_at timestamptz,
  add column if not exists email_assignments boolean not null default true,
  add column if not exists email_teacher_digest boolean not null default true;

comment on column public.user_profiles.teacher_digest_last_sent_at is
  'When the Sunday teacher digest last went to this teacher. The cron''s double-send guard, so no client grant: a client that could rewrite it could suppress or repeat its own mail.';
comment on column public.user_profiles.email_assignments is
  'Student preference: email when a teacher sets work or it is nearly due.';
comment on column public.user_profiles.email_teacher_digest is
  'Teacher preference: the Sunday class digest email.';

-- user_profiles has no table-wide client grant (20260807182215); each writable
-- column is granted by name, and a column added later is not writable until it
-- is. teacher_digest_last_sent_at is deliberately left out.
grant update (email_assignments, email_teacher_digest) on public.user_profiles to authenticated;
grant insert (email_assignments, email_teacher_digest) on public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Grants audit. Body of 20260925_community_votes_rpc.sql (the latest, which
-- mirrors production including the creators entries), with:
--   protected           += user_profiles.teacher_digest_last_sent_at,
--                          attempts.assignment_item_id
--   service_only        += teacher_audit_log
--   write_service_only  (new) assignment_submissions, classroom_memberships —
--                          clients read, never write
--   update_service_only (new) teacher_feedback — clients insert/delete, never update
--   rpc_allowlist       += teacher_roster_profiles, teacher_student_profiles,
--                          leave_classroom, mark_teacher_feedback_read,
--                          targeted_assignment_ids
-- ---------------------------------------------------------------------------
create or replace function public.audit_client_grants()
returns table(severity text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  client_roles constant text[] := array['anon', 'authenticated'];
  protected constant text[][] := array[
    array['user_profiles', 'role',                        'gates the whole /teacher surface'],
    array['user_profiles', 'teacher_verified_at',         'grants the free teacher allowance'],
    array['user_profiles', 'teacher_verified_reason',     'the audit trail for that grant'],
    array['user_profiles', 'reputation',                  'community standing'],
    -- Present in production (creators feature, applied from its own branch):
    -- a redefinition that omitted them would silently stop auditing them.
    array['user_profiles', 'referred_by',                 'creator attribution, written once by the service role'],
    array['user_profiles', 'referred_at',                 'when that attribution was written'],
    -- teacher system v2 (20260926b / 20260926c)
    array['user_profiles', 'teacher_digest_last_sent_at', 'the teacher digest cron''s double-send guard'],
    array['attempts',      'assignment_item_id',          'hands an attempt in against a teacher''s set']
  ];
  service_only constant text[] := array[
    'visit_sessions',
    'outreach_targets',
    'teacher_seat_requests',
    'study_plans',
    'study_plan_events',
    -- creators feature (production): service-role only.
    'creators',
    'creator_code_claims',
    'creator_conversions',
    'creator_tip_tests',
    'creator_applications',
    -- who viewed / exported / changed what about which student
    -- (20260926c_teacher_v2_feedback_audit.sql)
    'teacher_audit_log'
  ];
  -- Clients may SELECT these (under RLS) but every write is the service
  -- role's. Any INSERT / UPDATE / DELETE a client role can reach — table-wide
  -- or through a single column grant — is a violation.
  write_service_only constant text[] := array[
    -- a hand-in and its marks (20260926b_teacher_v2_assignments.sql)
    'assignment_submissions',
    -- who is in a class is what teacher_student_ids grants attempt access
    -- by; a client that could insert a row could enrol anyone
    -- (20260926a_teacher_v2_classrooms.sql)
    'classroom_memberships'
  ];
  -- Clients may insert and delete these under RLS, but never UPDATE.
  update_service_only constant text[] := array[
    -- read_at is set only by mark_teacher_feedback_read()
    -- (20260926c_teacher_v2_feedback_audit.sql)
    'teacher_feedback'
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
    -- (a) votes as auth.uid() only (20260925_community_votes_rpc.sql)
    'vote_post',
    'vote_comment',
    -- (a) teacher system v2 (20260926a/b/c):
    --   teacher_roster_profiles    empty unless auth.uid() teaches the class
    --   teacher_student_profiles   filtered to teacher_student_ids(auth.uid())
    --   leave_classroom            updates auth.uid()'s own membership only
    --   mark_teacher_feedback_read updates rows where student_id = auth.uid()
    --   targeted_assignment_ids    RLS helper; empty unless uid = auth.uid()
    'teacher_roster_profiles',
    'teacher_student_profiles',
    'leave_classroom',
    'mark_teacher_feedback_read',
    'targeted_assignment_ids',
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

  -- Client-readable, service-written tables. has_any_column_privilege is true
  -- for a table-wide grant too, so it also catches a single-column grant that
  -- has_table_privilege would miss.
  return query
    select 'write-service-only-table'::text,
           format('%s: %s holds %s on a table only the service role writes (possibly via PUBLIC or a column grant)',
                  t.name, r.rolname, p.priv)
      from unnest(write_service_only) as t(name)
     cross join unnest(client_roles) as r(rolname)
     cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as p(priv)
     where to_regclass('public.' || t.name) is not null
       and case
             when p.priv = 'DELETE' then has_table_privilege(r.rolname, 'public.' || t.name, p.priv)
             else has_any_column_privilege(r.rolname, 'public.' || t.name, p.priv)
           end;

  return query
    select 'update-service-only-table'::text,
           format('%s: %s holds UPDATE on a table whose rows only the service role or an RPC may change (possibly via PUBLIC or a column grant)',
                  t.name, r.rolname)
      from unnest(update_service_only) as t(name)
     cross join unnest(client_roles) as r(rolname)
     where to_regclass('public.' || t.name) is not null
       and has_any_column_privilege(r.rolname, 'public.' || t.name, 'UPDATE');

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

-- CREATE OR REPLACE keeps the existing ACL, so this only matters on a
-- database built by replay; re-asserted so this file stands on its own
-- (see 20260903b_lock_audit_client_grants.sql for why PUBLIC is named).
revoke execute on function public.audit_client_grants() from public;
revoke execute on function public.audit_client_grants() from anon, authenticated;
grant execute on function public.audit_client_grants() to service_role;
