-- Teacher system v2, part 1 of 3: classroom lifecycle, membership status, and
-- the RPCs every cross-user teacher read goes through.
-- (docs/TEACHER_SYSTEM_SPEC.md §1.1; parts 2 and 3 are 20260926b / 20260926c,
-- and 20260926c is where everything created here is added to
-- audit_client_grants().)
--
-- What changes, and why:
--
--   classrooms  gain subject_code, year_group, archived_at and settings.
--     subject_code is the lib/syllabi registry key ('9709', 'ib-chemistry-hl')
--     every v2 loader scopes analytics by. It is backfilled by
--     scripts/backfill-classroom-subject.ts rather than here, because the
--     board/level/subject → code mapping lives in TypeScript
--     (lib/teacher/subject.ts) and a second copy in SQL would drift. Rows the
--     script cannot resolve unambiguously stay null and the class settings
--     page asks the teacher.
--
--   classroom_memberships  gain a status. Without one, removing a student or
--     letting one leave could only mean deleting the row, which erases the
--     only record that they were ever in the class, and with it the teacher's
--     claim to the marks they handed in while they were a member. A status
--     flip keeps that history, and the three RLS helpers below key on it, so a
--     removed or departed student drops out of every teacher read in one
--     place.
--
--   teacher_student_ids / user_classroom_ids / teacher_classroom_ids  are the
--     helpers the attempts, classrooms and membership policies call. They now
--     exclude non-active memberships and archived classrooms. Every teacher
--     read of a student's attempts goes through teacher_student_ids, so this
--     is the single gate that makes removal, leaving and archiving fail
--     closed. teacher_classroom_ids and user_classroom_ids were never defined
--     in this repo (only granted and revoked), and 20260602 revoked EXECUTE
--     on teacher_classroom_ids from `authenticated` although policies call it;
--     both are recovered here.
--
--   teacher_roster_profiles / teacher_student_profiles  are the only way a
--     teacher reads another user's profile. No cross-user user_profiles policy
--     is added: a policy would expose every column of the row, these expose
--     four, and only for the caller's own students.
--
--   leave_classroom  lets a student leave without a client UPDATE grant on
--     memberships. No client role writes memberships at all any more (see
--     membership_teacher_read below for the hole that closes).
--
--   student_in_verified_classroom  is the billing helper for the class bonus.
--     Service-role only.
--
--   rate_limits.invite_lookup_count  is the bucket that caps invite-code
--     lookups and joins (§8 enumeration), replacing the interim
--     classroom_join_attempts table.
--
-- Idempotent: every statement is IF NOT EXISTS / CREATE OR REPLACE /
-- DROP ... IF EXISTS, so a re-run is a no-op.

-- ---------------------------------------------------------------------------
-- classrooms
-- ---------------------------------------------------------------------------
alter table public.classrooms
  add column if not exists subject_code text,
  add column if not exists year_group text,
  add column if not exists archived_at timestamptz,
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Teachers write their own classroom rows directly under RLS
-- (classroom_teacher_access), so the shape rules have to live in the database
-- as well as in the PATCH route: a hand-written PostgREST call must not be
-- able to store a settings array or a 10 kB year group.
alter table public.classrooms drop constraint if exists classrooms_settings_is_object;
alter table public.classrooms add constraint classrooms_settings_is_object
  check (jsonb_typeof(settings) = 'object');
alter table public.classrooms drop constraint if exists classrooms_subject_code_len;
alter table public.classrooms add constraint classrooms_subject_code_len
  check (subject_code is null or length(subject_code) between 1 and 64);
alter table public.classrooms drop constraint if exists classrooms_year_group_len;
alter table public.classrooms add constraint classrooms_year_group_len
  check (year_group is null or length(year_group) between 1 and 40);

comment on column public.classrooms.subject_code is
  'lib/syllabi registry key (''9709'', ''ib-chemistry-hl''). Scopes every analytics read to one subject. Null until backfilled or chosen in class settings.';
comment on column public.classrooms.year_group is
  'Free-text year group shown beside the class name (''Year 12''). Display only.';
comment on column public.classrooms.archived_at is
  'Set when the teacher archives the class. Archived classes drop out of teacher_student_ids and user_classroom_ids, so no live attempts are readable through them; retained assignment_submissions rows still are.';
comment on column public.classrooms.settings is
  'Teacher preferences: {"notify_submissions": "daily" | "off", "demo": boolean, "student_can_see_class_avg": boolean (default false)}.';

create index if not exists classrooms_teacher_active_idx
  on public.classrooms (teacher_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- classroom_memberships
-- ---------------------------------------------------------------------------
alter table public.classroom_memberships
  add column if not exists status text not null default 'active'
    check (status in ('active', 'removed', 'left')),
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid,
  add column if not exists left_at timestamptz;

comment on column public.classroom_memberships.status is
  'active | removed (by the teacher) | left (by the student). Only active rows are visible through teacher_student_ids / user_classroom_ids.';
comment on column public.classroom_memberships.removed_at is
  'When the teacher removed the student. Set with status = removed.';
comment on column public.classroom_memberships.removed_by is
  'Who removed the student (the teacher''s user id). Deliberately not a foreign key: it is an audit value and must survive that account being deleted.';
comment on column public.classroom_memberships.left_at is
  'When the student left via leave_classroom(). Set with status = left.';

create index if not exists classroom_memberships_active_idx
  on public.classroom_memberships (classroom_id, student_id)
  where status = 'active';
create index if not exists classroom_memberships_student_idx
  on public.classroom_memberships (student_id)
  where status = 'active';

-- Memberships are written only by the service role from here on.
--
-- membership_teacher_manage was FOR ALL, with a WITH CHECK that only asked
-- whether the classroom was the caller's. `role` is self-declared at
-- onboarding, so any signed-in user could become a "teacher", create a class,
-- INSERT a membership naming any user id they had seen (author ids are public
-- in the community), and teacher_student_ids would then hand them every
-- attempt that user had ever marked. The same UPDATE right let a teacher
-- backdate joined_at past the since-join scoping, or flip a student who had
-- left back to active. Nothing in the app writes memberships as the teacher:
-- joining is the service client in /api/classrooms/join, removal is the
-- service client in DELETE /api/teacher/classroom/[id]/students/[studentId],
-- leaving is leave_classroom(). So the teacher keeps read access and loses
-- write access, and the grants go too so audit_client_grants()
-- (write_service_only) can hold the line. Deleting a class still removes its
-- memberships: FK cascades do not run through RLS or grants.
drop policy if exists membership_teacher_manage on public.classroom_memberships;
drop policy if exists membership_teacher_read on public.classroom_memberships;
create policy membership_teacher_read on public.classroom_memberships
  for select
  to authenticated
  using (
    classroom_id in (select c.id from public.classrooms c where c.teacher_id = (select auth.uid()))
  );
revoke insert, update, delete on public.classroom_memberships from public, anon, authenticated;
grant select, insert, update, delete on public.classroom_memberships to service_role;

-- ---------------------------------------------------------------------------
-- RLS helpers
--
-- All three take the caller's own uid and return nothing for any other: the
-- `= auth.uid()` guard is what makes it safe for `authenticated` to hold
-- EXECUTE (which it must, because the policies run as the caller). A direct
-- /rest/v1/rpc call with someone else's uuid returns an empty set.
-- ---------------------------------------------------------------------------

-- teacher_student_ids: the argument has been named `uid` since
-- 20260714_grant_teacher_student_ids_authenticated.sql.
create or replace function public.teacher_student_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct cm.student_id
    from public.classroom_memberships cm
    join public.classrooms c on c.id = cm.classroom_id
   where c.teacher_id = uid
     and uid = auth.uid()
     and cm.status = 'active'
     and c.archived_at is null
$$;

-- user_classroom_ids / teacher_classroom_ids were created by hand on
-- production and never committed, so the name production gave their argument
-- is unknown — and CREATE OR REPLACE refuses to rename an input parameter.
-- Read the existing name from the catalogue and keep it. The bodies refer to
-- the argument as $1, never by name: in a SQL function a column wins over a
-- same-named parameter, so an argument that happened to be called
-- `student_id` would turn `cm.student_id = student_id` into "every row".
do $$
declare
  v_fn text;
  v_oid regprocedure;
  v_arg text;
  v_result text;
  v_body text;
begin
  foreach v_fn in array array['user_classroom_ids', 'teacher_classroom_ids'] loop
    v_oid := to_regprocedure(format('public.%I(uuid)', v_fn));
    v_arg := null;
    if v_oid is not null then
      select nullif(p.proargnames[1], ''), pg_get_function_result(p.oid)
        into v_arg, v_result
        from pg_proc p
       where p.oid = v_oid;
      -- CREATE OR REPLACE cannot change a return type either. If production's
      -- shape differs, stop here with a message rather than half-apply.
      if v_result is distinct from 'SETOF uuid' then
        raise exception
          'public.%(uuid) returns %, expected SETOF uuid; the RLS policies that call it would need rewriting first',
          v_fn, v_result;
      end if;
    end if;

    if v_fn = 'user_classroom_ids' then
      v_body := $body$
  select cm.classroom_id
    from public.classroom_memberships cm
    join public.classrooms c on c.id = cm.classroom_id
   where cm.student_id = $1
     and $1 = auth.uid()
     and cm.status = 'active'
     and c.archived_at is null
$body$;
    else
      -- Archived classrooms stay in the teacher's own list: they can still
      -- open one read-only and see the submissions it retained.
      v_body := $body$
  select c.id
    from public.classrooms c
   where c.teacher_id = $1
     and $1 = auth.uid()
$body$;
    end if;

    execute format(
      'create or replace function public.%I(%I uuid)
         returns setof uuid
         language sql
         stable
         security definer
         set search_path = public
       as %L',
      v_fn, coalesce(v_arg, 'uid'), v_body
    );
  end loop;
end
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC, and revoking from a named role
-- does not subtract from that (20260903b), so PUBLIC is revoked explicitly and
-- the roles that need the helpers are granted by name. anon is never a
-- teacher or a member.
revoke all on function public.teacher_student_ids(uuid) from public, anon;
revoke all on function public.user_classroom_ids(uuid) from public, anon;
revoke all on function public.teacher_classroom_ids(uuid) from public, anon;
grant execute on function public.teacher_student_ids(uuid) to authenticated, service_role;
grant execute on function public.user_classroom_ids(uuid) to authenticated, service_role;
grant execute on function public.teacher_classroom_ids(uuid) to authenticated, service_role;

comment on function public.teacher_student_ids(uuid) is
  'Active members of the caller''s non-archived classrooms. Called inside the attempts / submissions / feedback policies, so authenticated must hold EXECUTE; returns nothing unless uid = auth.uid().';
comment on function public.user_classroom_ids(uuid) is
  'The caller''s active, non-archived classroom memberships. Called inside the classroom_student_read and assignment_student_read policies, so authenticated must hold EXECUTE; returns nothing unless uid = auth.uid().';
comment on function public.teacher_classroom_ids(uuid) is
  'Every classroom the caller teaches, archived included. Called inside the assignments policy, so authenticated must hold EXECUTE; returns nothing unless uid = auth.uid().';

-- A student reads a classroom through user_classroom_ids, so leaving, removal
-- and archiving hide it at once. Production's policy already has this shape
-- (see 20260808120000_user_classroom_ids_execute.sql); the committed one in
-- 20250527 still has an inline membership subquery that ignores status and
-- archive, so a database built by replay would keep showing a departed
-- student their old class. Re-asserted so every environment agrees.
drop policy if exists classroom_student_read on public.classrooms;
create policy classroom_student_read on public.classrooms
  for select
  to authenticated
  using (id in (select public.user_classroom_ids((select auth.uid()))));

-- ---------------------------------------------------------------------------
-- Profile reads for teachers
-- ---------------------------------------------------------------------------

-- The roster for one class, every membership status included: the completion
-- matrix labels a departed student LEFT rather than silently dropping the row.
-- A left join, so a member whose profile row is missing still appears (with
-- nulls) instead of vanishing from the roster count.
create or replace function public.teacher_roster_profiles(p_classroom_id uuid)
returns table (
  id uuid,
  full_name text,
  board text,
  level text,
  joined_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select cm.student_id, p.full_name, p.board, p.level, cm.joined_at, cm.status
    from public.classroom_memberships cm
    left join public.user_profiles p on p.id = cm.student_id
   where cm.classroom_id = p_classroom_id
     and exists (
       select 1
         from public.classrooms c
        where c.id = p_classroom_id
          and c.teacher_id = auth.uid()
     )
$$;

-- Names for a set of students, filtered to the caller's CURRENT students, so
-- a removed student's name is no longer resolvable from their old attempts.
create or replace function public.teacher_student_profiles(p_student_ids uuid[])
returns table (
  id uuid,
  full_name text,
  board text,
  level text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.board, p.level
    from public.user_profiles p
   where p.id = any(p_student_ids)
     and p.id in (select public.teacher_student_ids(auth.uid()))
$$;

-- A student leaving their own class. Only ever touches the caller's own active
-- row; a removed membership stays removed (rejoining it needs the teacher).
create or replace function public.leave_classroom(p_classroom_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.classroom_memberships
     set status = 'left',
         left_at = now()
   where classroom_id = p_classroom_id
     and student_id = auth.uid()
     and status = 'active'
$$;

revoke all on function public.teacher_roster_profiles(uuid) from public, anon;
revoke all on function public.teacher_student_profiles(uuid[]) from public, anon;
revoke all on function public.leave_classroom(uuid) from public, anon;
grant execute on function public.teacher_roster_profiles(uuid) to authenticated, service_role;
grant execute on function public.teacher_student_profiles(uuid[]) to authenticated, service_role;
grant execute on function public.leave_classroom(uuid) to authenticated, service_role;

comment on function public.teacher_roster_profiles(uuid) is
  'Roster (every membership status) with name/board/level for one classroom the caller teaches; empty for anyone else''s classroom.';
comment on function public.teacher_student_profiles(uuid[]) is
  'Name/board/level for those of the given ids who are the caller''s active students. The only cross-user profile read teachers have.';
comment on function public.leave_classroom(uuid) is
  'Marks the caller''s own active membership of a classroom as left.';

-- ---------------------------------------------------------------------------
-- Billing helper (service role only — called from loadBillingContext with the
-- admin client). It takes an arbitrary user id, so it must NOT be reachable by
-- clients and is deliberately absent from audit_client_grants' rpc_allowlist.
-- ---------------------------------------------------------------------------
create or replace function public.student_in_verified_classroom(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.classroom_memberships cm
      join public.classrooms c on c.id = cm.classroom_id
      join public.user_profiles t on t.id = c.teacher_id
     where cm.student_id = p_user_id
       and cm.status = 'active'
       and c.archived_at is null
       and t.teacher_verified_at is not null
  )
$$;

revoke all on function public.student_in_verified_classroom(uuid) from public, anon, authenticated;
grant execute on function public.student_in_verified_classroom(uuid) to service_role;

comment on function public.student_in_verified_classroom(uuid) is
  'True when the user is an active member of a non-archived classroom whose teacher holds a verified seat (the class-bonus rule). Service role only.';

-- ---------------------------------------------------------------------------
-- Invite-code lookup bucket
--
-- bump_rate_limit / refund_rate_limit below are 20260925_rate_limit_rpc.sql
-- verbatim, with 'invite_lookup_count' appended to both counter allowlists.
-- ---------------------------------------------------------------------------
alter table public.rate_limits add column if not exists invite_lookup_count integer not null default 0;

comment on column public.rate_limits.invite_lookup_count is
  'Invite-code lookups (/api/classrooms/by-code, per client IP) and joins (/api/classrooms/join, per user). Enumeration guard; see docs/TEACHER_SYSTEM_SPEC.md §8.';

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_ip text,
  p_date date,
  p_counter text,
  p_limit integer
) RETURNS TABLE (allowed boolean, count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Allowlist BEFORE the format(): %I stops injection but not "bump a column
  -- this caller was never meant to touch".
  IF p_counter IS NULL OR p_counter NOT IN (
    'mark_count', 'omni_count', 'contact_count', 'signup_count',
    'teachback_count', 'explain_count', 'search_count', 'question_detail_count',
    'invite_lookup_count'
  ) THEN
    RAISE EXCEPTION 'bump_rate_limit: unknown counter %', p_counter;
  END IF;
  IF p_ip IS NULL OR length(p_ip) = 0 OR length(p_ip) > 128 THEN
    RAISE EXCEPTION 'bump_rate_limit: invalid key';
  END IF;
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'bump_rate_limit: date is required';
  END IF;

  -- A cap of zero (or less) admits nobody; do not create a row for it.
  IF coalesce(p_limit, 0) <= 0 THEN
    EXECUTE format('SELECT %I FROM public.rate_limits WHERE ip = $1 AND date = $2', p_counter)
      INTO v_count USING p_ip, p_date;
    RETURN QUERY SELECT false, coalesce(v_count, 0);
    RETURN;
  END IF;

  -- Insert the day's row at 1, or increment — but only while under the limit.
  -- When the WHERE fails nothing is updated and RETURNING yields no row, so
  -- v_count stays NULL: that is the "denied" signal.
  EXECUTE format(
    'INSERT INTO public.rate_limits (ip, date, %1$I) VALUES ($1, $2, 1)
     ON CONFLICT (ip, date) DO UPDATE
       SET %1$I = public.rate_limits.%1$I + 1
       WHERE public.rate_limits.%1$I < $3
     RETURNING %1$I',
    p_counter
  ) INTO v_count USING p_ip, p_date, p_limit;

  IF v_count IS NULL THEN
    EXECUTE format('SELECT %I FROM public.rate_limits WHERE ip = $1 AND date = $2', p_counter)
      INTO v_count USING p_ip, p_date;
    RETURN QUERY SELECT false, coalesce(v_count, p_limit);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, date, text, integer) FROM public;
REVOKE ALL ON FUNCTION public.bump_rate_limit(text, date, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, date, text, integer) TO service_role;

COMMENT ON FUNCTION public.bump_rate_limit(text, date, text, integer) IS
  'Atomically consume one slot of a daily counter. Returns (allowed, count): allowed=false means the counter was already at the limit and was NOT incremented.';

-- Give a slot back. Floors at zero so a refund can never mint credit — a
-- request that was denied (and so never consumed) must not be able to
-- "refund" its way to an extra slot.
CREATE OR REPLACE FUNCTION public.refund_rate_limit(
  p_ip text,
  p_date date,
  p_counter text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_counter IS NULL OR p_counter NOT IN (
    'mark_count', 'omni_count', 'contact_count', 'signup_count',
    'teachback_count', 'explain_count', 'search_count', 'question_detail_count',
    'invite_lookup_count'
  ) THEN
    RAISE EXCEPTION 'refund_rate_limit: unknown counter %', p_counter;
  END IF;
  IF p_ip IS NULL OR length(p_ip) = 0 OR length(p_ip) > 128 THEN
    RAISE EXCEPTION 'refund_rate_limit: invalid key';
  END IF;

  EXECUTE format(
    'UPDATE public.rate_limits
       SET %1$I = greatest(%1$I - 1, 0)
     WHERE ip = $1 AND date = $2
     RETURNING %1$I',
    p_counter
  ) INTO v_count USING p_ip, p_date;

  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_rate_limit(text, date, text) FROM public;
REVOKE ALL ON FUNCTION public.refund_rate_limit(text, date, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_rate_limit(text, date, text) TO service_role;

COMMENT ON FUNCTION public.refund_rate_limit(text, date, text) IS
  'Return one slot of a daily counter (floor 0). Used when a run that consumed a slot up front fails before producing anything.';
