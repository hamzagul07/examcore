-- Teacher system v2, part 2 of 3: assignments ("sets") and what students hand
-- in against them. (docs/TEACHER_SYSTEM_SPEC.md §1.2)
--
--   assignments             one set of work for one classroom
--   assignment_items        its questions / whole paper / prompt, in order
--   assignment_students     per-student flags (excused, extension, feedback,
--                           reminded) and, for target = 'students', who it is for
--   assignment_submissions  one row per (item, student): the best attempt so
--                           far. Written only by the service role
--                           (lib/teacher/assignments.ts); clients may read.
--   attempts.assignment_item_id
--                           stamped by the marking routes when a mark starts
--                           from an assignment link. Clients can never write it.
--
-- Two deliberate departures from the spec's sketch, both to keep it working:
--
--   1. assignment_student_read checks "am I individually targeted" through a
--      SECURITY DEFINER helper (targeted_assignment_ids) instead of querying
--      assignment_students inline. Inline, the policies form a cycle — the
--      student policy on assignments reads assignment_students, whose teacher
--      policy reads assignments, whose student policy … — and Postgres
--      rejects every query on either table with "infinite recursion detected
--      in policy" (reproduced on Postgres 16).
--      The helper reads assignment_students without RLS, which breaks the
--      cycle, and returns only the caller's own rows.
--
--   2. A past_paper_question item does not require mark_scheme_id at the
--      table level. The FK is ON DELETE SET NULL; with a NOT NULL check the
--      set-null would violate the check and turn any mark_schemes delete into
--      an error. The item keeps paper_code / paper_session / question_number,
--      which is exactly what reconciliation falls back to (the legacy
--      'q:paper|session|qn' key) when the scheme id is gone. resolveItems
--      (lib/teacher/assignments.ts) must still resolve and store the id on
--      every insert.
--
-- Policies are scoped TO authenticated and anon's table privileges are
-- revoked: nothing here is public, and a policy that only names the role that
-- needs it cannot be reached by one that does not.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  instructions text check (length(instructions) <= 4000),
  kind text not null check (kind in ('question_set', 'whole_paper', 'topic_drill', 'practice_prompt')),
  subject_code text not null check (length(subject_code) between 1 and 64),
  is_mock boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'blindspot', 'error_group', 'reteach')),
  source_ref jsonb check (source_ref is null or jsonb_typeof(source_ref) = 'object'),
  target text not null default 'all' check (target in ('all', 'students')),
  due_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  reconciled_at timestamptz,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assignments is
  'A set of work a teacher gives one classroom. Drafts have published_at null; students see a row only once published, not archived, while an active member, and (for target = students) when listed in assignment_students.';
comment on column public.assignments.subject_code is
  'lib/syllabi registry key copied from the classroom when the set is created.';
comment on column public.assignments.source is
  'What prompted the set: manual, or a blindspot / error group / reteach card. source_ref carries that card''s parameters.';
comment on column public.assignments.target is
  'all = every active member; students = only those with an assignment_students row.';
comment on column public.assignments.closed_at is
  'When the teacher closed the set to further hand-ins (unless settings.allow_late).';
comment on column public.assignments.archived_at is
  'Soft delete. Hidden from students; the teacher''s DELETE sets this.';
comment on column public.assignments.reconciled_at is
  'Last time plain /mark attempts were matched to this set''s items. reconcileAssignment skips when this is under a minute old.';
comment on column public.assignments.settings is
  '{"timed_minutes": int?, "allow_late": boolean (default true)}.';

create index if not exists assignments_classroom_due_idx
  on public.assignments (classroom_id, due_at desc);
create index if not exists assignments_teacher_idx
  on public.assignments (teacher_id, created_at desc);
create index if not exists assignments_open_idx
  on public.assignments (classroom_id)
  where published_at is not null and archived_at is null;

create or replace function public.touch_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_assignment on public.assignments;
create trigger trg_touch_assignment
  before update on public.assignments
  for each row execute function public.touch_assignment();

create table if not exists public.assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  position int not null check (position >= 0),
  item_type text not null check (item_type in ('past_paper_question', 'whole_paper', 'prompt')),
  mark_scheme_id uuid references public.mark_schemes (id) on delete set null,
  paper_code text,
  paper_session text,
  question_number text,
  total_marks numeric check (total_marks is null or total_marks >= 0),
  syllabus_tags text[],
  topic_code text,
  prompt_text text check (length(prompt_text) <= 2000),
  ib_component_key text,
  unique (assignment_id, position),
  constraint assignment_items_shape check (
    (item_type = 'past_paper_question'
       and paper_code is not null and paper_session is not null and question_number is not null)
    or (item_type = 'whole_paper'
       and paper_code is not null and paper_session is not null and mark_scheme_id is null)
    or (item_type = 'prompt'
       and prompt_text is not null and mark_scheme_id is null)
  )
);

comment on table public.assignment_items is
  'The ordered contents of a set. A topic drill is resolved to past_paper_question rows when the set is composed; topic_code records which topic each came from.';
comment on column public.assignment_items.mark_scheme_id is
  'The banked question this item is. Set on every past_paper_question insert; null afterwards only if that mark scheme row is deleted, when reconciliation falls back to paper|session|question_number.';
comment on column public.assignment_items.topic_code is
  'Provenance for drills: the syllabus leaf this question was picked for.';
comment on column public.assignment_items.ib_component_key is
  'For IB prompt items, the assessment component the student marks against.';

create index if not exists assignment_items_scheme_idx
  on public.assignment_items (mark_scheme_id);

create table if not exists public.assignment_students (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  excused_at timestamptz,
  extended_due_at timestamptz,
  feedback text check (length(feedback) <= 2000),
  feedback_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

comment on table public.assignment_students is
  'Per-student state on a set: excused, extended deadline, the teacher''s note, last reminder. For target = students, a row is also what makes the set visible to that student.';
comment on column public.assignment_students.extended_due_at is
  'A per-student deadline. It only ever extends: lateness is judged against the later of this and assignments.due_at.';
comment on column public.assignment_students.feedback is
  'Plain text (stripRawHtml on write); rendered without raw HTML.';

create index if not exists assignment_students_student_idx
  on public.assignment_students (student_id);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  item_id uuid not null references public.assignment_items (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete set null,
  attempt_count int not null default 1 check (attempt_count >= 1),
  marks_earned numeric check (marks_earned is null or marks_earned >= 0),
  total_marks numeric check (total_marks is null or total_marks >= 0),
  status text not null check (status in ('submitted', 'late', 'reviewed')),
  source text not null check (source in ('linked', 'reconciled')),
  first_submitted_at timestamptz not null,
  last_submitted_at timestamptz not null,
  unique (item_id, student_id)
);

comment on table public.assignment_submissions is
  'One row per (item, student): the best attempt handed in so far. Written only by the service role; kept when the student leaves or the class is archived, so the teacher keeps marks captured while the student was a member.';
comment on column public.assignment_submissions.attempt_id is
  'The best attempt (highest marks, teacher overrides included).';
comment on column public.assignment_submissions.source is
  'linked = marked from the assignment link (attempts.assignment_item_id); reconciled = matched afterwards from a plain /mark on the same question.';

create index if not exists assignment_submissions_assignment_idx
  on public.assignment_submissions (assignment_id, student_id);
create index if not exists assignment_submissions_attempt_idx
  on public.assignment_submissions (attempt_id);
create index if not exists assignment_submissions_student_idx
  on public.assignment_submissions (student_id, last_submitted_at desc);

-- ---------------------------------------------------------------------------
-- Policy helper (see note 1 in the header)
-- ---------------------------------------------------------------------------
create or replace function public.targeted_assignment_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.assignment_id
    from public.assignment_students s
   where s.student_id = uid
     and uid = auth.uid()
$$;

revoke all on function public.targeted_assignment_ids(uuid) from public, anon;
grant execute on function public.targeted_assignment_ids(uuid) to authenticated, service_role;

comment on function public.targeted_assignment_ids(uuid) is
  'Assignment ids the caller has an assignment_students row on. Used inside assignment_student_read so that policy does not query assignment_students under RLS (which recurses); returns nothing unless uid = auth.uid().';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.assignments enable row level security;
alter table public.assignment_items enable row level security;
alter table public.assignment_students enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists assignment_teacher_all on public.assignments;
create policy assignment_teacher_all on public.assignments
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and classroom_id in (select public.teacher_classroom_ids((select auth.uid())))
  );

drop policy if exists assignment_student_read on public.assignments;
create policy assignment_student_read on public.assignments
  for select
  to authenticated
  using (
    published_at is not null
    and archived_at is null
    and classroom_id in (select public.user_classroom_ids((select auth.uid())))
    and (
      target = 'all'
      or id in (select public.targeted_assignment_ids((select auth.uid())))
    )
  );

drop policy if exists assignment_items_teacher_all on public.assignment_items;
create policy assignment_items_teacher_all on public.assignment_items
  for all
  to authenticated
  using (assignment_id in (select a.id from public.assignments a where a.teacher_id = (select auth.uid())))
  with check (assignment_id in (select a.id from public.assignments a where a.teacher_id = (select auth.uid())));

-- The assignments policies already restrict a student to published sets of
-- their active classes that target them, so "an item of an assignment I can
-- see" is the whole rule.
drop policy if exists assignment_items_student_read on public.assignment_items;
create policy assignment_items_student_read on public.assignment_items
  for select
  to authenticated
  using (assignment_id in (select a.id from public.assignments a));

drop policy if exists assignment_students_teacher_all on public.assignment_students;
create policy assignment_students_teacher_all on public.assignment_students
  for all
  to authenticated
  using (assignment_id in (select a.id from public.assignments a where a.teacher_id = (select auth.uid())))
  with check (
    assignment_id in (select a.id from public.assignments a where a.teacher_id = (select auth.uid()))
    and student_id in (select public.teacher_student_ids((select auth.uid())))
  );

drop policy if exists assignment_students_student_read on public.assignment_students;
create policy assignment_students_student_read on public.assignment_students
  for select
  to authenticated
  using (student_id = (select auth.uid()));

-- Teacher reads are gated on teacher_student_ids as well as ownership, so a
-- removed or departed student's submissions fail closed through the API; the
-- archived-class view reads them with the service client after proving
-- ownership.
drop policy if exists assignment_submissions_teacher_read on public.assignment_submissions;
create policy assignment_submissions_teacher_read on public.assignment_submissions
  for select
  to authenticated
  using (
    assignment_id in (select a.id from public.assignments a where a.teacher_id = (select auth.uid()))
    and student_id in (select public.teacher_student_ids((select auth.uid())))
  );

drop policy if exists assignment_submissions_student_read on public.assignment_submissions;
create policy assignment_submissions_student_read on public.assignment_submissions
  for select
  to authenticated
  using (student_id = (select auth.uid()));

-- Grants. Supabase's default privileges hand every new table to anon and
-- authenticated; take anon off all four, and leave authenticated read-only on
-- submissions (a student must not be able to mint a hand-in, nor a teacher a
-- mark). audit_client_grants() lists assignment_submissions under
-- write_service_only so a regrant is caught.
revoke all on public.assignments from anon;
revoke all on public.assignment_items from anon;
revoke all on public.assignment_students from anon;
revoke all on public.assignment_submissions from public, anon, authenticated;
grant select on public.assignment_submissions to authenticated;
grant all on public.assignments, public.assignment_items, public.assignment_students,
  public.assignment_submissions to service_role;

-- ---------------------------------------------------------------------------
-- attempts.assignment_item_id
-- ---------------------------------------------------------------------------
alter table public.attempts
  add column if not exists assignment_item_id uuid
    references public.assignment_items (id) on delete set null;

comment on column public.attempts.assignment_item_id is
  'The assignment item this mark was started from. Stamped at insert by the marking routes (service role) after validateAssignmentItemForStudent; no client role can write it.';

create index if not exists attempts_assignment_item_idx
  on public.attempts (assignment_item_id, user_id)
  where assignment_item_id is not null;

-- Clients must not be able to stamp assignment_item_id: a student who could
-- would hand in any attempt against any set, and one who could clear it would
-- un-submit. Every write to attempts in the app goes through the service
-- role, but the table predates the migrations directory and on Supabase
-- `anon` / `authenticated` normally hold table-wide INSERT and UPDATE. A
-- column cannot be carved out of a table-wide grant (see
-- 20260807182215_user_profiles_column_grants.sql), so for each client role
-- that holds one: revoke it, then grant back every column except this one.
-- A grant held through PUBLIC reaches every role, so it is revoked too and
-- replaced by explicit grants — service_role first, so the server never
-- loses write access mid-migration.
do $$
declare
  v_cols text;
  v_priv text;
  v_role text;
  v_public_holds boolean;
  v_had text[];
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'attempts'
     and column_name <> 'assignment_item_id';

  execute 'grant insert, update on public.attempts to service_role';

  foreach v_priv in array array['INSERT', 'UPDATE'] loop
    -- Who holds it table-wide right now (directly or via PUBLIC), captured
    -- before anything is revoked.
    v_had := array(
      select r
        from unnest(array['anon', 'authenticated']) as r
       where has_table_privilege(r, 'public.attempts', v_priv)
    );

    select exists (
      select 1
        from pg_class c
       cross join lateral aclexplode(c.relacl) a
       where c.oid = 'public.attempts'::regclass
         and a.grantee = 0
         and a.privilege_type = v_priv
    ) into v_public_holds;

    if v_public_holds then
      execute format('revoke %s on public.attempts from public', v_priv);
    end if;

    foreach v_role in array v_had loop
      execute format('revoke %s on public.attempts from %I', v_priv, v_role);
      execute format('grant %s (%s) on public.attempts to %I', v_priv, v_cols, v_role);
    end loop;
  end loop;

  -- Postcondition. If a client role can still reach the column (say through
  -- membership of some other role), fail the migration rather than ship a
  -- writable stamp.
  foreach v_role in array array['anon', 'authenticated'] loop
    foreach v_priv in array array['INSERT', 'UPDATE'] loop
      if has_table_privilege(v_role, 'public.attempts', v_priv)
         or has_column_privilege(v_role, 'public.attempts', 'assignment_item_id', v_priv) then
        raise exception
          '% still holds % on attempts.assignment_item_id after the grant reshuffle; check its role memberships before applying',
          v_role, v_priv;
      end if;
    end loop;
  end loop;
end
$$;
