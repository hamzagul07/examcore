# markscheme.app Teacher System — FINAL BUILD SPEC (v2, workflow-first)

Winner: **workflow-first**. Every `must_fix_in_winner` is applied; grafts taken: review `decision` + `scoreReviewPriority`, `buildErrorGroups`, server-loaded Omni context, `created_at >= joined_at` scoping + `student_visible`, `CONTRACTS.md`, class-bonus cap instead of a sponsored pool, membership `status`, `teacher_audit_log`, `settings.demo`, `is_mock`, `seat-grant.ts` + `/admin/teacher-seats`, `reviewed` submission status, CSV rules, `AssignmentPrintSheet` on `.ec-exam-sheet`. Rejected: trust meter/auto-trust, letters, mock-on-behalf, schools/licences/co-teachers, parent tokens, `intervention` 308 (route is deleted; nothing consumes it), student "link my attempt" (reconciliation on `mark_scheme_id` covers it and a self-link endpoint invites gaming).

Conflict rulings (one line each):
- **Billing**: class-bonus cap, not a pool — `reserve_mark_usage` already takes `p_cap`, so no new lock path or `event_type` alter.
- **Removal**: `status='removed'|'left'` on memberships (audit trail) and teacher reads of submissions gated on `teacher_student_ids` (fails closed) — no `student_id` nulling.
- **Archived classrooms**: excluded from `teacher_student_ids` and `user_classroom_ids`; an archived class page shows only retained `assignment_submissions` rows (marks captured while active), never live attempts.
- **Reconciliation key**: `attempts.mark_scheme_id` equality (topic drills are resolved to banked questions at compose time); `paper|session|qn` only for legacy rows with null `mark_scheme_id`; whole-paper via stamp or `ai_marking.paper_code/paper_session`.
- **Omni**: `app/api/omni-ai/route.ts` teacher branch loads data server-side; client `context.data` for `teacher_dashboard` is ignored.
- **Analytics rewrite** is its own early package (`analytics-core`) so pages are not blocked on it.

Env flag: `TEACHER_V2=1` (`lib/teacher/flags.ts: isTeacherV2()`); new nav/pages and hooks are dark without it.

---

## 1. Data model — migrations (package `contracts`)

Conventions: `enable row level security`; `(select auth.uid())` in policies; `comment on column`; FK indexes; `timestamptz`. Three files, applied in order. Each redefinition of `audit_client_grants()` copies the **latest** body (20260917_roadmap_v3.sql) and only adds entries.

### 1.1 `20261001a_teacher_v2_classrooms.sql`

```sql
alter table public.classrooms
  add column if not exists subject_code text,              -- registry key: '9709','9701','ib-math-aa-hl'
  add column if not exists year_group text,
  add column if not exists archived_at timestamptz,
  add column if not exists settings jsonb not null default '{}'::jsonb;
-- settings keys: {"notify_submissions":"daily"|"off","demo":boolean,"student_can_see_class_avg":boolean(default false)}
create index if not exists classrooms_teacher_active_idx on public.classrooms (teacher_id) where archived_at is null;
-- backfill: update classrooms set subject_code = <resolveClassroomSubjectCode(board, level, subject)> — done by
-- scripts/backfill-classroom-subject.ts (contracts package) since the mapping lives in TS; rows left null prompt in settings.

alter table public.classroom_memberships
  add column if not exists status text not null default 'active' check (status in ('active','removed','left')),
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid,
  add column if not exists left_at timestamptz;
create index if not exists classroom_memberships_active_idx on public.classroom_memberships (classroom_id, student_id) where status = 'active';
create index if not exists classroom_memberships_student_idx on public.classroom_memberships (student_id) where status = 'active';

-- RPC bodies (all: language sql, stable, security definer, set search_path = public)
create or replace function public.teacher_student_ids(uid uuid) returns setof uuid ... as $$
  select distinct cm.student_id from classroom_memberships cm
  join classrooms c on c.id = cm.classroom_id
  where c.teacher_id = uid and uid = auth.uid() and cm.status = 'active' and c.archived_at is null $$;
create or replace function public.user_classroom_ids(uid uuid) returns setof uuid ... as $$
  select cm.classroom_id from classroom_memberships cm
  join classrooms c on c.id = cm.classroom_id
  where cm.student_id = uid and uid = auth.uid() and cm.status = 'active' and c.archived_at is null $$;
-- Body was never in the repo; EXECUTE for authenticated was revoked in 20260602 although RLS calls it. Recover + grant.
create or replace function public.teacher_classroom_ids(uid uuid) returns setof uuid ... as $$
  select id from classrooms where teacher_id = uid and uid = auth.uid() $$;
grant execute on function public.teacher_student_ids(uuid), public.user_classroom_ids(uuid), public.teacher_classroom_ids(uuid) to authenticated;

create or replace function public.teacher_roster_profiles(p_classroom_id uuid)
returns table(id uuid, full_name text, board text, level text, joined_at timestamptz, status text) ... as $$
  select p.id, p.full_name, p.board, p.level, cm.joined_at, cm.status
  from classroom_memberships cm join user_profiles p on p.id = cm.student_id
  where cm.classroom_id = p_classroom_id
    and exists (select 1 from classrooms c where c.id = p_classroom_id and c.teacher_id = auth.uid()) $$;
create or replace function public.teacher_student_profiles(p_student_ids uuid[])
returns table(id uuid, full_name text, board text, level text) ... as $$
  select p.id, p.full_name, p.board, p.level from user_profiles p
  where p.id = any(p_student_ids) and p.id in (select teacher_student_ids(auth.uid())) $$;
create or replace function public.leave_classroom(p_classroom_id uuid) returns void language sql security definer set search_path = public as $$
  update classroom_memberships set status = 'left', left_at = now()
  where classroom_id = p_classroom_id and student_id = auth.uid() and status = 'active' $$;
grant execute on function public.teacher_roster_profiles(uuid), public.teacher_student_profiles(uuid[]), public.leave_classroom(uuid) to authenticated;
revoke all on function public.teacher_roster_profiles(uuid), public.teacher_student_profiles(uuid[]), public.leave_classroom(uuid) from anon;

-- Billing helper: service-only (called from loadBillingContext with the admin client). NOT in rpc_allowlist.
create or replace function public.student_in_verified_classroom(p_user_id uuid) returns boolean ... as $$
  select exists (select 1 from classroom_memberships cm join classrooms c on c.id = cm.classroom_id
    join user_profiles t on t.id = c.teacher_id
    where cm.student_id = p_user_id and cm.status = 'active' and c.archived_at is null and t.teacher_verified_at is not null) $$;
revoke all on function public.student_in_verified_classroom(uuid) from public, anon, authenticated;
grant execute on function public.student_in_verified_classroom(uuid) to service_role;

-- Rate limit bucket for invite lookups/joins (atomic bump_rate_limit pattern, code review §1.7)
alter table public.rate_limits add column if not exists invite_lookup_count integer not null default 0;
-- Redefine bump_rate_limit and refund_rate_limit verbatim from 20260925_rate_limit_rpc.sql with 'invite_lookup_count' appended to both IN-lists.
```

`classroom_student_read` and `membership_student_read` are unchanged (they go through `user_classroom_ids`, which now filters status and archive). `membership_teacher_manage` unchanged (teacher may update `status`; routes use it, then audit via service).

### 1.2 `20261001b_teacher_v2_assignments.sql`

```sql
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  instructions text check (length(instructions) <= 4000),
  kind text not null check (kind in ('question_set','whole_paper','topic_drill','practice_prompt')),
  subject_code text not null,
  is_mock boolean not null default false,
  source text not null default 'manual' check (source in ('manual','blindspot','error_group','reteach')),
  source_ref jsonb,
  target text not null default 'all' check (target in ('all','students')),
  due_at timestamptz, published_at timestamptz, closed_at timestamptz, archived_at timestamptz,
  reconciled_at timestamptz,
  settings jsonb not null default '{}'::jsonb,   -- {"timed_minutes":int?,"allow_late":true}
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index assignments_classroom_due_idx on public.assignments (classroom_id, due_at desc);
create index assignments_teacher_idx on public.assignments (teacher_id, created_at desc);
create index assignments_open_idx on public.assignments (classroom_id) where published_at is not null and archived_at is null;
alter table public.assignments enable row level security;
create policy assignment_teacher_all on public.assignments for all
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()) and classroom_id in (select teacher_classroom_ids((select auth.uid()))));
create policy assignment_student_read on public.assignments for select
  using (published_at is not null and archived_at is null
     and classroom_id in (select user_classroom_ids((select auth.uid())))
     and (target = 'all' or exists (select 1 from assignment_students s where s.assignment_id = id and s.student_id = (select auth.uid()))));

create table public.assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position int not null,
  item_type text not null check (item_type in ('past_paper_question','whole_paper','prompt')),
  mark_scheme_id uuid references public.mark_schemes(id) on delete set null,
  paper_code text, paper_session text, question_number text,
  total_marks numeric, syllabus_tags text[], topic_code text,   -- topic_code = provenance for drills
  prompt_text text check (length(prompt_text) <= 2000), ib_component_key text,
  unique (assignment_id, position),
  check ((item_type = 'past_paper_question' and mark_scheme_id is not null and paper_code is not null and paper_session is not null and question_number is not null)
      or (item_type = 'whole_paper' and paper_code is not null and paper_session is not null and mark_scheme_id is null)
      or (item_type = 'prompt' and prompt_text is not null and mark_scheme_id is null))
);
create index assignment_items_scheme_idx on public.assignment_items (mark_scheme_id);
alter table public.assignment_items enable row level security;
create policy assignment_items_teacher_all on public.assignment_items for all
  using (assignment_id in (select id from assignments where teacher_id = (select auth.uid())))
  with check (assignment_id in (select id from assignments where teacher_id = (select auth.uid())));
create policy assignment_items_student_read on public.assignment_items for select
  using (assignment_id in (select id from assignments));   -- parent policy already restricts to published+member+target

create table public.assignment_students (          -- per-student flags + targeting
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  excused_at timestamptz, extended_due_at timestamptz,
  feedback text check (length(feedback) <= 2000), feedback_at timestamptz,
  reminded_at timestamptz, created_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);
create index assignment_students_student_idx on public.assignment_students (student_id);
alter table public.assignment_students enable row level security;
create policy assignment_students_teacher_all on public.assignment_students for all
  using (assignment_id in (select id from assignments where teacher_id = (select auth.uid())))
  with check (assignment_id in (select id from assignments where teacher_id = (select auth.uid()))
          and student_id in (select teacher_student_ids((select auth.uid()))));
create policy assignment_students_student_read on public.assignment_students for select using (student_id = (select auth.uid()));

create table public.assignment_submissions (       -- SELECT-only for clients; writes service-only
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  item_id uuid not null references public.assignment_items(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete set null,   -- best attempt
  attempt_count int not null default 1,
  marks_earned numeric, total_marks numeric,
  status text not null check (status in ('submitted','late','reviewed')),
  source text not null check (source in ('linked','reconciled')),
  first_submitted_at timestamptz not null, last_submitted_at timestamptz not null,
  unique (item_id, student_id)
);
create index assignment_submissions_assignment_idx on public.assignment_submissions (assignment_id, student_id);
create index assignment_submissions_attempt_idx on public.assignment_submissions (attempt_id);
create index assignment_submissions_student_idx on public.assignment_submissions (student_id, last_submitted_at desc);
alter table public.assignment_submissions enable row level security;
create policy assignment_submissions_teacher_read on public.assignment_submissions for select
  using (assignment_id in (select id from assignments where teacher_id = (select auth.uid()))
     and student_id in (select teacher_student_ids((select auth.uid()))));   -- removed/left students fail closed
create policy assignment_submissions_student_read on public.assignment_submissions for select using (student_id = (select auth.uid()));
revoke all on public.assignment_submissions from anon, authenticated;
grant select on public.assignment_submissions to authenticated;

alter table public.attempts add column if not exists assignment_item_id uuid references public.assignment_items(id) on delete set null;
create index if not exists attempts_assignment_item_idx on public.attempts (assignment_item_id, user_id) where assignment_item_id is not null;
-- Clients must not be able to stamp this column. attempts grants predate the migrations dir, so: if authenticated
-- holds table-wide INSERT/UPDATE on attempts, drop it and grant back every column except assignment_item_id
-- (same DO-block technique as 20260807182215). Verified by the protected[] entry below.
```

### 1.3 `20261001c_teacher_v2_feedback_audit.sql`

```sql
alter table public.teacher_overrides
  add column if not exists decision text not null default 'override' check (decision in ('confirm','override','flag')),
  add column if not exists student_visible boolean not null default true,
  add column if not exists supersedes_override_id uuid references public.teacher_overrides(id),
  add column if not exists classroom_id uuid references public.classrooms(id) on delete set null,
  add column if not exists reasoning_note text check (length(reasoning_note) <= 1000);
create index if not exists teacher_overrides_attempt_created_idx on public.teacher_overrides (attempt_id, created_at);
drop policy if exists override_teacher_access on public.teacher_overrides;
create policy override_teacher_access on public.teacher_overrides for all
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid())
          and attempt_id in (select id from attempts where user_id in (select teacher_student_ids((select auth.uid())))));
drop policy if exists override_student_read on public.teacher_overrides;
create policy override_student_read on public.teacher_overrides for select
  using (student_visible and attempt_id in (select id from attempts where user_id = (select auth.uid())));

create table public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(), read_at timestamptz
);
create index teacher_feedback_attempt_idx on public.teacher_feedback (attempt_id);
create index teacher_feedback_unread_idx on public.teacher_feedback (student_id) where read_at is null;
alter table public.teacher_feedback enable row level security;
create policy feedback_teacher_manage on public.teacher_feedback for all
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid())
          and student_id in (select teacher_student_ids((select auth.uid())))
          and (classroom_id is null or classroom_id in (select id from classrooms where teacher_id = (select auth.uid()))));
create policy feedback_student_read on public.teacher_feedback for select using (student_id = (select auth.uid()));
revoke update on public.teacher_feedback from authenticated;   -- read_at only via RPC; teachers edit by delete+insert
create or replace function public.mark_teacher_feedback_read(p_ids uuid[]) returns void language sql security definer set search_path = public as $$
  update teacher_feedback set read_at = now() where id = any(p_ids) and student_id = auth.uid() and read_at is null $$;
grant execute on function public.mark_teacher_feedback_read(uuid[]) to authenticated;

create table public.teacher_audit_log (            -- service-only, append-only
  id bigint generated always as identity primary key,
  actor_id uuid not null, classroom_id uuid, student_id uuid,
  action text not null check (action in ('view_student','export_csv','override','feedback','remove_student','regenerate_code','archive_classroom','delete_classroom')),
  meta jsonb, created_at timestamptz not null default now()
);
create index teacher_audit_student_idx on public.teacher_audit_log (student_id, created_at);
alter table public.teacher_audit_log enable row level security;
revoke all on public.teacher_audit_log from anon, authenticated;
revoke all on sequence public.teacher_audit_log_id_seq from anon, authenticated;

alter table public.user_profiles
  add column if not exists teacher_digest_last_sent_at timestamptz,   -- deliberately NO client grant
  add column if not exists email_assignments boolean not null default true,
  add column if not exists email_teacher_digest boolean not null default true;
grant update (email_assignments, email_teacher_digest) on public.user_profiles to authenticated;
grant insert (email_assignments, email_teacher_digest) on public.user_profiles to authenticated;

-- audit_client_grants(): copy body from 20260917_roadmap_v3.sql, then:
--   protected += ['user_profiles','teacher_digest_last_sent_at',...], ['attempts','assignment_item_id',...]
--   service_only += 'teacher_audit_log'
--   NEW write_service_only text[] := array['assignment_submissions']  → report if any client role has INSERT/UPDATE/DELETE
--   rpc_allowlist += 'teacher_roster_profiles','teacher_student_profiles','mark_teacher_feedback_read','leave_classroom'
```

`pnpm test:grants` (live DB) must be green; also replay all three files on a fresh preview DB.

---

## 2. SHARED CONTRACTS (package `contracts`)

### 2.1 `lib/teacher/types.ts`

```ts
export type AssignmentKind = 'question_set' | 'whole_paper' | 'topic_drill' | 'practice_prompt'
export type AssignmentSource = 'manual' | 'blindspot' | 'error_group' | 'reteach'
export type SubmissionStatus = 'submitted' | 'late' | 'reviewed'
export type ReviewDecision = 'confirm' | 'override' | 'flag'
export type MembershipStatus = 'active' | 'removed' | 'left'
export type ClassroomSettings = { notify_submissions?: 'daily' | 'off'; demo?: boolean; student_can_see_class_avg?: boolean }

export type Classroom = { id: string; teacher_id: string; name: string; description: string | null; invite_code: string;
  board: string; level: string; subject: string; subject_code: string | null; year_group: string | null;
  archived_at: string | null; settings: ClassroomSettings; created_at: string; updated_at: string }

export type Assignment = { id: string; classroom_id: string; teacher_id: string; title: string; instructions: string | null;
  kind: AssignmentKind; subject_code: string; is_mock: boolean; source: AssignmentSource; source_ref: Record<string, unknown> | null;
  target: 'all' | 'students'; due_at: string | null; published_at: string | null; closed_at: string | null; archived_at: string | null;
  reconciled_at: string | null; settings: { timed_minutes?: number; allow_late?: boolean }; created_at: string; updated_at: string }

export type AssignmentItem = { id: string; assignment_id: string; position: number; item_type: 'past_paper_question' | 'whole_paper' | 'prompt';
  mark_scheme_id: string | null; paper_code: string | null; paper_session: string | null; question_number: string | null;
  total_marks: number | null; syllabus_tags: string[] | null; topic_code: string | null; prompt_text: string | null; ib_component_key: string | null }

export type AssignmentSubmission = { id: string; assignment_id: string; item_id: string; student_id: string; attempt_id: string | null;
  attempt_count: number; marks_earned: number | null; total_marks: number | null; status: SubmissionStatus; source: 'linked' | 'reconciled';
  first_submitted_at: string; last_submitted_at: string }

export type AssignmentStudentFlags = { assignment_id: string; student_id: string; excused_at: string | null; extended_due_at: string | null;
  feedback: string | null; feedback_at: string | null; reminded_at: string | null }

export type StudentItemState = 'done' | 'late' | 'reviewed' | 'missing' | 'excused' | 'left'
export type StudentAssignmentState = { student_id: string; display_name: string; membership: MembershipStatus;
  items: Array<{ item_id: string; state: StudentItemState; marks_earned: number | null; total_marks: number | null; attempt_id: string | null }>;
  overall_pct: number | null; is_late: boolean; excused: boolean; extended_due_at: string | null; feedback: string | null }

export type AssignmentProgress = { assignment_id: string; total_students: number; handed_in: number; late: number; excused: number;
  missing: number; left: number; class_mean_pct: number | null; per_item: Array<{ item_id: string; mean_pct: number | null; n: number }>;
  students: StudentAssignmentState[] }

export type AssignmentSummary = Pick<Assignment, 'id' | 'title' | 'kind' | 'due_at' | 'published_at' | 'closed_at' | 'is_mock'> &
  { item_count: number; handed_in: number; late: number; total_students: number; status: 'draft' | 'open' | 'closed' }

export type TeacherFeedback = { id: string; attempt_id: string; student_id: string; teacher_id: string; classroom_id: string | null;
  body: string; created_at: string; read_at: string | null }

export type RosterStudent = { id: string; full_name: string | null; board: string | null; level: string | null; joined_at: string;
  status: MembershipStatus; last_attempt_at: string | null; due_count: number; open_late: number }

export type ClassWeek = { classroom_id: string; week: string; assignments: AssignmentSummary[]; submissions_delta: number;
  silent_students: Array<{ id: string; display_name: string; days_silent: number }>;
  struggling: Array<{ id: string; display_name: string; pct: number }>; improving: Array<{ id: string; display_name: string; delta_pct: number }>;
  headline_gap: string | null; unreviewed: number }

export type TeacherOverview = { classes: Array<{ id: string; name: string; subject_code: string | null; members: number; open_assignments: number;
  due_this_week: number; unreviewed: number; late_students: number; headline_gap: string | null; archived: boolean }>;
  needs_you: { unreviewed: number; late_students: number; silent_classes: number } }

export type ReviewQueueItem = { attempt_id: string; student_id: string; display_name: string; classroom_id: string | null; assignment_id: string | null;
  created_at: string; marks_earned: number; total_marks: number; decision: ReviewDecision | null; priority: number; reasons: string[] }

export type ErrorGroup = { key: string; label: string; classification: string; leaf_code: string | null; student_ids: string[]; evidence_count: number }

export type ItemInput = { item_type: 'past_paper_question'; paper_code: string; paper_session: string; question_number: string }
  | { item_type: 'whole_paper'; paper_code: string; paper_session: string }
  | { item_type: 'prompt'; prompt_text: string; total_marks?: number; ib_component_key?: string }
  | { item_type: 'topic'; topic_code: string; per_topic?: number }              // resolved server-side into past_paper_question rows
export type AssignmentDraftInput = { title: string; kind: AssignmentKind; instructions?: string; due_at?: string | null; is_mock?: boolean;
  items: ItemInput[]; settings?: Assignment['settings']; publish: boolean; source?: AssignmentSource; source_ref?: Record<string, unknown>;
  target?: 'all' | { student_ids: string[] } }
export type ApiError = { error: string; field?: string }
```

### 2.2 Pure helpers (contracts, tested)

```ts
// lib/teacher/assignment-status.ts
export function isLate(submittedAt: string, dueAt: string | null, extendedDueAt: string | null): boolean
export function deriveStudentState(input: { membership: MembershipStatus; items: AssignmentItem[]; submissions: AssignmentSubmission[];
  flags: AssignmentStudentFlags | null; due_at: string | null }): Omit<StudentAssignmentState, 'student_id' | 'display_name'>
export function summariseProgress(states: StudentAssignmentState[], items: AssignmentItem[]): Omit<AssignmentProgress, 'assignment_id' | 'students'>
export function assignmentStatus(a: Pick<Assignment, 'published_at' | 'closed_at' | 'archived_at' | 'due_at'>, now?: Date): 'draft' | 'open' | 'closed'
// lib/teacher/subject.ts
export function resolveClassroomSubjectCode(board: string, level: string, subject: string): string | null   // via lib/syllabi + IB codes
export function displayName(fullName: string | null): string   // "Amira K." — the ONLY name formatter allowed into prompts/emails
// lib/teacher/flags.ts
export function isTeacherV2(): boolean
// lib/teacher/reconcile-keys.ts
export function legacyAttemptKey(a: { mark_schemes?: { paper_code: string; paper_session: string; question_number: string } | null }): string | null // 'q:paper|session|qn' as loadRoadmapEvidence
```

### 2.3 `lib/teacher/notify.ts` (interface fixed here; contracts lands no-op bodies, `notify-email-crons` fills them)

```ts
import 'server-only'
export async function notifyAssignmentPublished(assignmentId: string): Promise<void>
export async function notifySubmission(input: { assignmentId: string; studentId: string; attemptId: string }): Promise<void>  // batched per assignment/day
export async function notifyRemind(assignmentId: string, studentIds: string[]): Promise<number>
export async function onOverrideSaved(attemptId: string): Promise<void>      // recompute submission (status 'reviewed', marks), notify student if visible
export async function onFeedbackSaved(feedbackId: string): Promise<void>
export async function auditLog(entry: { actorId: string; classroomId?: string | null; studentId?: string | null;
  action: 'view_student' | 'export_csv' | 'override' | 'feedback' | 'remove_student' | 'regenerate_code' | 'archive_classroom' | 'delete_classroom'; meta?: Record<string, unknown> }): Promise<void>
```

### 2.4 Analytics/loader signatures (published here; implemented by `analytics-core`)

```ts
// lib/teacher-classroom-data.ts
export async function getClassroomStudentIds(supabase, classroomId: string, opts?: { status?: MembershipStatus[] }): Promise<string[]>
export async function getClassroomAttempts(supabase, classroomId: string, opts: { subjectCode: string | null; sinceJoin?: boolean; since?: string; limit?: number })
  : Promise<{ attempts: ClassroomAttempt[]; truncated: boolean }>      // fetchAllRows; selects error_classifications, ai_marking, mark_scheme_id, assignment_item_id
export async function getStudentProfiles(supabase, studentIds: string[]): Promise<Map<string, { full_name: string | null; board: string | null }>>  // via teacher_student_profiles RPC
// lib/teacher-analytics.ts  (generic over lib/syllabi)
export function computeTopicAnalytics(attempts, subjectCode): TopicAnalytics[]
export function computeBlindspots(attempts, subjectCode): TopicAnalytics[]
export function computeStudentQuadrants(attempts, studentIds, subjectCode, board): StudentQuadrantMetric[]
export function summarizeClassAnalytics(attempts, studentIds, subjectCode): ClassSummary
// lib/teacher/review-priority.ts
export function scoreReviewPriority(a: AttemptForPriority): { priority: number; reasons: string[] }
// lib/teacher/groups.ts
export function buildErrorGroups(attempts: ClassroomAttempt[], subjectCode: string, minStudents = 2): ErrorGroup[]
```

### 2.5 `lib/teacher/assignments.ts` (server-only; implemented by `assignments-backend`)

```ts
export async function listAssignments(supabase, classroomId, opts: { status?: 'open'|'closed'|'draft'; cursor?: string; limit?: number }): Promise<{ assignments: AssignmentSummary[]; next_cursor: string | null }>
export async function resolveItems(admin, subjectCode: string, items: ItemInput[]): Promise<Omit<AssignmentItem,'id'|'assignment_id'>[]>  // findMarkSchemeRow / findQuestionForTopic; max 12 rows
export async function createAssignment(supabase, admin, ctx: { classroomId; teacherId; subjectCode }, input: AssignmentDraftInput): Promise<Assignment>
export async function loadAssignment(supabase, admin, assignmentId): Promise<{ assignment: Assignment; items: AssignmentItem[]; progress: AssignmentProgress } | null>
export async function reconcileAssignment(admin, assignmentId, opts?: { force?: boolean }): Promise<{ linked: number }>  // skips if reconciled_at < 60s ago
export async function onAttemptMarked(admin, attempt: { id; user_id; assignment_item_id: string | null; mark_scheme_id: string | null; marks_earned; total_marks; created_at }): Promise<void>
export async function validateAssignmentItemForStudent(admin, itemId: string, studentId: string): Promise<{ ok: true; item: AssignmentItem; assignment: Assignment } | { ok: false; reason: string }>
export async function studentMarkHref(item: AssignmentItem, assignmentId: string): string   // pastPaperMarkHref({..., assignmentItemId, returnTo:`/dashboard/assignments/${assignmentId}`}) or /mark?subject&task for prompts
```

### 2.6 `lib/teacher/CONTRACTS.md` (contracts) — CSS + component manifest

Selectors (owned by `chrome-design`, built against by everyone): `ms-teacher-tabs`, `ms-teacher-tabbar`, `ms-needs-you`, `ms-set-slip`, `ms-set-composer`, `ms-set-matrix`, `ms-set-matrix__cell(--done|--late|--reviewed|--missing|--excused|--left)`, `ms-reteach`, `ms-students-watch`, `ms-feedback-note`, `ms-review-console`, `ms-review-filters`, `ms-my-classes`, `ms-assign-card`, `ms-error-group`, `ms-teacher-print`. Component exports: `ClassTabs`, `ClassDeskHead`, `NeedsYouStrip`, `ClassSlipList`, `WeekStrip`, `ReteachCard`, `StudentsToWatch`, `CompletionMatrix`, `AssignmentComposer`, `ReviewConsole`, `FeedbackComposer`, `AssignmentsSetCard`, `TeacherFeedbackNote`, `MyClassesCard`, `ErrorGroupsPanel`.

---

## 3. Routes

Teacher route shape: `createClient()` → `auth.getUser()` 401 `{error:'Unauthorized'}` → `requireTeacher` 403 `{error:'Not a teacher'}` → `verifyTeacherOwnsClassroom` 404 `{error:'Classroom not found'}` → RLS client; service client only after ownership. Manual validation → `400 {error, field}`. Params `Promise<{...}>`. Student JSON POSTs: `authenticateRouteRequest` + `jsonWithAuthCookies`. Every list is keyset-paginated; every cohort read via `fetchAllRows`. Base `T = /api/teacher/classroom/[id]`.

| Route | Method | Authz | Contract | Package |
|---|---|---|---|---|
| `T` | PATCH | owner | `{name?, description?, board?, level?, subject_code?, year_group?, settings?}` → `{classroom}` | desk-management |
| `T` | DELETE | owner | `?mode=archive` (default; audit `archive_classroom`) / `?mode=delete` (only if archived and 0 active members) | desk-management |
| `T/invite` | POST | owner | → `{invite_code}` via `generateInviteCode()`; retry 23505; audit `regenerate_code`. `POST /api/teacher/classrooms` also switches to it (8-hex fork removed) | desk-management |
| `T/roster` | GET | owner | → `{students: RosterStudent[]}` (`teacher_roster_profiles` + `countDueByStudent` + late counts). **Replaces `T/students` GET (deleted)** | desk-management |
| `T/students/[studentId]` | DELETE | owner, active member | service: `status='removed', removed_at, removed_by`; audit; notification `class_removed` | desk-management |
| `T/export` | GET | owner | `?scope=assignments\|attempts` → `text/csv`, `Content-Disposition: attachment`; display name only, no email; active members only; audit `export_csv` | desk-management |
| `/api/teacher/overview` | GET | teacher | → `TeacherOverview` | desk-management |
| `/api/teacher/seed-demo` | POST | teacher, non-prod | sets `settings.demo=true`, seeds one published assignment | desk-management |
| `/api/admin/teacher-seats` | GET/POST | `isAdminUser` | GET `?status` → requests; POST `{request_id, action:'approve'\|'decline', reason}` via `lib/teacher/seat-grant.ts` | desk-management |
| `T/assignments` | GET | owner | `?status&cursor` → `{assignments, next_cursor}` | assignments-backend |
| `T/assignments` | POST | owner | `AssignmentDraftInput` → `{assignment, items}`; items ≤12; `target.student_ids` ⊆ active members; publish → `notifyAssignmentPublished` | assignments-backend |
| `T/assignments/[aid]` | GET/PATCH/DELETE | owner | GET → `{assignment, items, progress}` (calls `reconcileAssignment`, ≤1/min); PATCH `{title?, instructions?, due_at?, closed_at?, items?(draft only)}`; DELETE → `archived_at` | assignments-backend |
| `T/assignments/[aid]/publish` | POST | owner | → `{assignment}`; sets `published_at`; fan-out | assignments-backend |
| `T/assignments/[aid]/remind` | POST | owner | `{student_ids?}` → `{sent}`; 1 per assignment per 6h (`reminded_at`) | assignments-backend |
| `T/assignments/[aid]/students/[sid]` | PATCH | owner, active member | `{excused?, extended_due_at?, feedback?}` → `AssignmentStudentFlags`; feedback plain-text (`stripRawHtml`) | assignments-backend |
| `T/assignments/[aid]/gaps` | GET | owner | → `CohortGapReport` over linked attempts | assignments-backend |
| `/api/teacher/question-picker` | GET | teacher | `?subject_code&paper_code&paper_session` or `&topic_code` → `{questions:[{id, paper_code, paper_session, question_number, total_marks, syllabus_tags, preview}]}` (preview ≤160 chars; scheme text never returned) | assignments-backend |
| `/api/mark/process` | POST | existing | new optional `assignment_item_id`; `validateAssignmentItemForStudent` (member, published, not archived/closed unless `allow_late`) → 400 on invalid; stamped at insert; `onAttemptMarked` beside `notifyMarkReady` | assignments-backend |
| `/api/mark/whole-paper/init` | POST | existing | same field; stamped in the insert at ~line 470; reservation stays on the student (teacher branch in `run` untouched) | assignments-backend |
| `T/week` | GET | owner | `?week=YYYY-Www` → `ClassWeek` | class-pages |
| `T/{analytics,blindspots,quadrants,due,gaps}` | GET | owner | existing shapes, now subject-scoped and since-join; `T/students/[sid]/due` kept | insights-omni |
| `T/groups` | GET | owner | → `{groups: ErrorGroup[]}` | insights-omni |
| `T/students/[sid]/history` | GET | owner, member | `?cursor` → attempts (canonical select + `assignment_item_id`, `decision`) 30/page; audit `view_student` once per session per student | insights-omni |
| `/api/omni-ai` | POST | existing | `teacher_dashboard` context body is `{classroom_id, view}`; server verifies ownership, loads `buildOmniClassContext` (names via `displayName`), ignores `context.data`; `render_cta` hrefs must be same-origin paths under `/teacher/` or dropped | insights-omni |
| `/api/teacher/reviews` | GET | teacher | `?classroom_id&student_id&assignment_id&status=pending\|confirmed\|overridden\|flagged&cursor&limit≤50` → `{items: ReviewQueueItem[], next_cursor, counts}`; sorted priority desc then created_at; names via `teacher_student_profiles` | reviews-feedback |
| `/api/teacher/attempt/[id]/override` | GET | teacher (RLS read) | existing + `overrides[]`, `feedback[]`, `display_name` via RPC | reviews-feedback |
| `/api/teacher/attempt/[id]/override` | POST | teacher (RLS read) | `{decision, override_marks_awarded?, override_total_earned?, reasoning_note?, student_visible?}` → `{marks_earned, decision}`; see §6 validation; service updates `attempts`; `onOverrideSaved`; audit `override` | reviews-feedback |
| `/api/teacher/attempt/[id]/feedback` | POST/DELETE | teacher, student ∈ `teacher_student_ids` | `{body, classroom_id?}` → `{feedback}`; DELETE `{id}`; `onFeedbackSaved`; audit `feedback` | reviews-feedback |
| `/api/assignments` | GET | student | → `{open: StudentAssignment[], done: StudentAssignment[]}` | student-side |
| `/api/assignments/[aid]` | GET | member | → `{assignment, items:[{...item, mark_href, submission, state}], flags, feedback}` | student-side |
| `/api/feedback/read` | POST | student | `{ids}` → RPC | student-side |
| `/api/classrooms/[id]/leave` | POST | member | RPC `leave_classroom` → `{ok}` | student-side |
| `/api/classrooms/mine` | GET | student | → `{classes:[{id,name,subject,teacher_display_name,joined_at}]}` (teacher name via service, first name + initial) | student-side |
| `/api/classrooms/by-code/[code]` | GET | anon | `bumpRateLimit(admin, clientIp, 'invite_lookup_count', 60)`; on `RateLimitUnavailableError` → 503; over → 429 | student-side |
| `/api/classrooms/join` | POST | user | `bumpRateLimit(admin, userRateLimitKey(userId), 'invite_lookup_count', 20)`; re-activates a `left` row (`status='active', joined_at=now()`); `removed` rows require teacher (409 `{error:'Removed by teacher'}`) | student-side |
| `/api/cron/teacher-digest`, `/api/cron/assignment-reminders` | GET | `CRON_SECRET` | §5 | notify-email-crons |

Deleted: `T/intervention/**`, `T/students/route.ts`, `components/teacher/InterventionGenerator.tsx`. `intervention_tests` table kept, unread.

---

## 4. Pages

Frame: `app/teacher/layout.tsx` → `TeacherNav` (Desk `DK` `/teacher/dashboard` · Classes `CL` `/teacher/classrooms` · Reviews `RV` · `NotificationBell` from `components/community` · ThemeSwitcher · ACC · OUT) + `TeacherTabBar` (≤900px, `.ec-tabbar` markup, `app-shell-tabbed`; Desk/Classes/Reviews/Account) → `<main class="app-shell ms-teacher-layout">`. New `app/teacher/not-found.tsx` (Examiner's Ink slip: crimson `404` stamp, "Not on your desk", back link). All data pages are **server components** (`force-dynamic`, `redirect('/auth/signin?next=…')`, `notFound()` on empty RLS read) calling `lib/teacher/**` loaders once; islands only for interaction. Each route: `loading.tsx` (skeleton slips, `aria-busy`), errors via `app/teacher/error.tsx`. Empty `.ms-teacher-empty`; inline errors `.ms-teacher-error role=alert`. Numbers via `percentOrDash`/`NO_DATA`; names via `displayName` only in prompts/emails (full name allowed in teacher UI).

**`/teacher/dashboard` — Teacher desk** (desk-management): `TeacherDeskHead` (eyebrow "Teacher desk", `DK`, h1 "Your desk", Caveat note "3 sets due this week") → `NeedsYouStrip` (`.ms-needs-you` spine tiles: unreviewed, late students, silent classes; `LoadingLink`s) → `ClassSlipList` (`.ms-teacher-class-slip`: subject stamp `--acc` via `getSubjectAccent`, name, "24 students · 2 open sets", mini tally) → archived under `Disclosure` → `TeacherSeatRequestCard` (pending / declined-with-reason + "Apply again" / hidden when verified). Empty: create class + demo (hidden in production). `/teacher/classrooms` = same list, full page.

**`/teacher/classroom/[id]` — Class week** (class-pages): `ClassDeskHead` (name, subject chip, `<code>` invite, demo flag from `settings.demo`) → `ClassTabs` (`.ms-teacher-tabs`, `aria-current`: Week · Sets · Students · Gaps · Reviews · Settings) → `WeekStrip` (open sets as `.ms-set-slip` with `.ms-class-due__bar` done/late/missing and "3 late: Amira, Ben, +1") → `ReteachCard` (`.ms-reteach`, dual-ink rule; headline gap of last closed set; "Print handout" / "Set a drill" → composer `?source=reteach&codes=`) → `StudentsToWatch` (silent 14d / <40% on last set / improving) → `ErrorGroupsPanel` (from `T/groups`; "Set a drill for this group" → composer `?source=error_group&students=`) → `InviteCard` → `GradeRiskMatrix` (rebuilt in insights-omni: SVG, untimed hollow + labelled, jitter, dots are links, CSS transitions). Archived class: read-only banner, Week shows retained submissions only.

**`/teacher/classroom/[id]/assignments`** (class-pages): `SegmentedControl` Open/Closed/Drafts; `.ms-set-slip` (kind stamp `Q`/`PPR`/`DRL`/`PRM`, `MOCK` chip, due, tally); primary "Set work".
**`.../assignments/new`** (`AssignmentComposer` island, `.ms-set-composer`): What (kind `SegmentedControl`; `QuestionPicker` paper/session → `/api/teacher/question-picker` rows with `aria-pressed`, `MathText` preview; `TopicPicker` from `getSyllabusTree(subject_code)` auto-picks 2/topic; whole paper; prompt textarea) · Who (all / picked students; prefilled by `?students=`) · When (datetime-local, chips "Fri 4pm"/"Mon 9am", timed minutes, mock toggle) · Review slip → Publish (`Button size=lg`) / Save draft. Unverified teacher sees the allowance note (§7).
**`.../assignments/[aid]`**: `AssignmentHead` (title, stamps, status chip, Remind / Extend / Close / Print / Export) → `CompletionMatrix` (`.ms-set-matrix`, students × items; cells `✓ 7/9` brand, `L 4/9` crimson outline, `RV` reviewed, `—` missing, `EXC`, `LEFT`; sticky first column; ≤640px per-student slips) → `ItemGapList` (mean %, `.ms-gap-track`, top 3 missed notes, "Open N scripts" → reviews filtered by `assignment_id`) → `LateList` with Excuse/Extend `Sheet`. Mock sets add `MockDistributionPanel` (grade histogram via `predictGrade` per student; `NO_DATA` under 3 marked). Empty: "Waiting for ink — 0 of 24 handed in".
**`.../assignments/[aid]/print`**: `AssignmentPrintSheet` on `.ec-exam-sheet` + `.ec-scheme-cite`, question text and marks only, footer join code.

**`.../students`** (insights-omni): roster rows (name, last active, due badge, latest set, `LEFT` chip for non-active; Remove via desk-management's DELETE). **`.../students/[studentId]`**: `StudentHead` → `StudentAssignmentRecord` → `StudentAttemptHistory` (from `T/students/[sid]/history`; `OV`/`OK`/`FLG` badges) → `StudentDueList` → `FeedbackComposer` (Caveat preview). **`.../gaps`**: existing layout, subject-aware, assignment filter, "Set a drill" CTA, `ErrorGroupsPanel`.

**`.../settings`** (desk-management): `ClassroomSettingsForm` (name, description, subject `SegmentedControl` from `getSyllabusSubjectCodes()`, year group, notify_submissions, class-average toggle), invite code + "New code" (`Dialog` confirm), roster with Remove (confirm), Export CSV, Archive / Delete (danger, crimson spine). Allowance slip: "Your students get +20 marks/month from this class" or seat card.

**`/teacher/reviews`** (reviews-feedback): server first page; `ReviewFilters` as `<form method=get>` selects (class, student, set, status); `.ms-review-slip` with priority reasons as `ec-chip-warning`; "Load more". **`/teacher/reviews/[attemptId]`**: server load or `notFound()`; ink viewers left, `ReviewConsole` (`.ms-review-console`) right: stamps **OK** confirm · **OV** per-mark `earned` toggles + total input + note + `student_visible` · **FLG**; `FormErrorAlert` on 4xx; `ec-stamp-in` then prev/next within filter; `FeedbackComposer` below.

**`/admin/teacher-seats`** (desk-management): per-page `isAdminUser` gate (copy `app/admin/community/page.tsx:16`); pending slips with Approve / Decline + reason.

**Student surfaces** (student-side): `/dashboard` → `DashboardSection "Set by your teacher"` → `AssignmentsSetCard` (next due, crimson `DUE`, open count, "See all"; hidden with none). `/dashboard/assignments` (open/done). `/dashboard/assignments/[id]`: instructions, items as `.ec-exam-sheet` rows → "Mark this" `LoadingLink` (`mark_href`) or result stamp; teacher feedback as `MarginNote`; notice "Marks on this set are visible to your teacher". `/dashboard/attempt/[id]`: `TeacherFeedbackNote` when a visible override/feedback exists ("Re-marked by your teacher: 6 → 7"); marks read via `/api/feedback/read`. `/mark` result: when `assignment_item_id` present, line "Linked to <set title> — your teacher can see this mark". `/account`: `MyClassesCard` (`.ms-my-classes`: class, teacher, joined, +20 note if applicable, **Leave** with retention text). `/join/[code]`: retention/visibility statement *before* enrol ("Your teacher will see work you mark on this platform for their subject from today; if you leave, they keep marks for sets you completed"); success → `/dashboard/assignments`.

---

## 5. Notifications and email

Service inserts into `notifications` (push rides `trg_notifications_push`). Email via `sendEmailAsync` + `renderBrandedEmailHtml`, honouring `email_suppressions` and prefs, chunked 50 per `after()`.

| Event | In-app (type → href) | Email |
|---|---|---|
| Published | students `assignment_set` → `/dashboard/assignments/[id]` | `assignment-set.ts` if `email_assignments`; unsubscribe kind `assignments` |
| Due in 24h, missing | `assignment_due` | `assignment-due.ts` (cron `assignment-reminders` 16:00 UTC daily; `ASSIGNMENT_REMINDER_SEND`) |
| Teacher Remind | `assignment_due` | same |
| Submission | teacher `submission_received`, one row per assignment per UTC day (upsert by `href`); off when `notify_submissions='off'` | — (digest) |
| Override/confirm with `student_visible` | `mark_reviewed` → attempt | `teacher-feedback.ts` |
| Feedback | `teacher_feedback` → attempt | same |
| Removed | `class_removed` → `/account` | — |
| Seat decision | `seat_decision` | approved (existing) / declined (new, with reason) |
| Sunday 16:00 UTC | — | `teacher-digest.ts` (cron `teacher-digest`, `TEACHER_DIGEST_SEND`; runs reconciliation first; per class `statCell`s handed in/late/mean, headline gap, unreviewed, silent; `teacher_digest_last_sent_at` guard; `email_teacher_digest`; kind `teacher_digest`). Runs before student `weekly-report` 17:00. |

`lib/community/email-unsubscribe.ts`: add `'assignments' | 'teacher_digest'` to `UnsubscribeKind`, to the `!==` chain in the verifier, and to `unsubscribeColumnPatch`/`unsubscribeLabel`. `vercel.json` gains both crons (`runtime='nodejs'`, Bearer `CRON_SECRET`, maxDuration 300).

---

## 6. Override / decision validation (`lib/teacher/override-validate.ts`, tested)

Input `{decision, override_marks_awarded?, override_total_earned?, reasoning_note?, student_visible?}`:
- `decision ∈ {confirm, override, flag}`. `confirm`/`flag` accept no mark changes; they insert a `teacher_overrides` row with `original_marks_awarded = override_marks_awarded = AI snapshot`, `override_total_earned = attempts.marks_earned`.
- `override`: if `ai_marking.marks_awarded` exists → array must have the **same `mark_id` set** (no additions/removals), each `{mark_id, earned: boolean, reasoning?: string ≤500}`; `reasoning`/`margin_note` passed through `stripRawHtml` and length-capped; `type`/`line_reference` copied from AI, never from input. `override_total_earned` integer in `[0, attempts.total_marks]`, required. For `band_result`/`criteria_results`/`mcq_breakdown` scripts (no per-mark array) only `override_total_earned` is accepted; per-mark input → 400.
- `reasoning_note ≤1000`, plain text. `student_visible` default true.
- AI snapshot: earliest `teacher_overrides` row for the attempt (`order by created_at asc limit 1`).`original_marks_awarded`; if none, current `ai_marking.marks_awarded`. New row's `supersedes_override_id` = latest previous row id.
- Service update of `attempts`: `marks_earned = override_total_earned`, `ai_marking = {...ai_marking, marks_awarded, teacher_override: true, teacher_decision, teacher_notes: reasoning_note}` only for `override`; `confirm`/`flag` leave `attempts` untouched. Then `onOverrideSaved(attemptId)`: submission for that attempt gets `marks_earned = attempts.marks_earned` (overridden marks count for best-of), `status='reviewed'` for confirm/override; notifies student if visible.

---

## 7. Billing

- Free for `role='teacher'`: classes, sets, matrix, reviews, decisions, feedback, groups, exports, digests.
- Teacher's own marks unchanged (seat → `effectiveAccess` scholar floor, `teacherMarkCap()` 300).
- **Student marks on assignment items charge the student**, as today; marking depth follows the student's access. **Class bonus**: `loadBillingContext` adds a fourth parallel call `admin.rpc('student_in_verified_classroom', {p_user_id})`; `capForAccess(access, capTier, isTeacher, bonus = 0)` returns `(isTeacher ? max(base, teacherCap) : base) + bonus`; bonus = `teacherClassStudentBonus()` (env `TEACHER_CLASS_STUDENT_BONUS`, default 20) when eligible and not a teacher. `reserve_mark_usage` receives the raised `p_cap` — no RPC change. `MarkAllowance` gains `class_bonus: number`; `CreditChip` shows "+20 from your class"; `BillingLimitBanner` copy mentions it. Unverified teacher's composer shows "Your students use their own allowance until your seat is approved".
- `auth/check`, `process`, whole-paper `init/run`, `omni-ai`, `dashboard` compute access with `teacherVerifiedAt` (closes review §67); `auth/check` returns `teacherVerified`.
- Sponsored classroom pool: **phase 2** (needs a classroom-keyed RPC and `event_type` alter) — not in this pass.

---

## 8. Security and privacy

- Cross-user profile reads only via `teacher_roster_profiles` / `teacher_student_profiles` (override GET, reviews, student pages, `getStudentProfiles` all switch). No cross-user `user_profiles` policy is added.
- Teacher sees: active members' attempts (RLS), filtered in loaders to `classrooms.subject_code` and `created_at >= joined_at`; never email. Students see nothing of each other; class average only if `settings.student_can_see_class_avg`.
- Removal/leave: `status` flip → `teacher_student_ids` drops the student → attempts, submissions, feedback writes fail closed; matrix shows `LEFT` from memberships. Archived classes drop out of both RPCs.
- Overrides bounded (§6), snapshot preserved, `teacher_id` + audit on every write; `override_teacher_access` WITH CHECK tightened to the teacher's students.
- `teacher_audit_log` written for view_student, export_csv, override, feedback, remove_student, regenerate_code, archive/delete; `/account/privacy` export (student-side) includes the student's assignments, submissions, visible overrides, feedback and audit rows about them.
- Enumeration: `invite_lookup_count` atomic bucket; fail closed (503) when the RPC is unavailable. Codes regenerate instantly.
- Omni: server-built prompts, `displayName`, `render_cta` same-origin `/teacher/**` allowlist (review lines 22-23).
- Inputs: `instructions`, `feedback`, `reasoning_note`, `prompt_text` through `stripRawHtml` + length caps; rendered without rehype-raw.
- Grants: new columns/tables covered by `audit_client_grants()`; `pnpm test:grants` green; replay on fresh DB.

---

## 9. Rollout

1. `contracts` lands (migrations + types + stubs + manifest). 2. `analytics-core`, `assignments-backend`, `billing` behind `TEACHER_V2`; pipeline hook is a no-op without `assignment_item_id`. 3. `chrome-design` + pages ship dark; nav items appear under the flag. 4. `notify-email-crons` dry-run one Sunday, then flip `*_SEND`. 5. Flip `TEACHER_V2` for verified teachers → everyone; changelog notes analytics now classroom-scoped (numbers change); marketing copy: "radar" → "blindspot report", "effort" → "speed".

Risks: attempts grant reshuffle on a pre-migration table (verify on staging with `has_table_privilege`); RPC rewrites are the single gate (tests for removed/left/archived cases); 1000-row cap (`fetchAllRows`); publish email volume (chunked); wrong `subject_code` backfill (settings prompt when null).

---

## 10. WORK BREAKDOWN

Test wiring: `contracts` adds `"test:teacher": "tsx --test lib/teacher/**/*.test.ts"` so later packages add test files without touching `package.json`.

### P0 `contracts` — lands first
Owns: `supabase/migrations/20261001a_teacher_v2_classrooms.sql`, `20261001b_teacher_v2_assignments.sql`, `20261001c_teacher_v2_feedback_audit.sql`; `scripts/backfill-classroom-subject.ts`; `lib/teacher/types.ts`, `lib/teacher/assignment-status.ts` (+test), `lib/teacher/subject.ts` (+test), `lib/teacher/flags.ts`, `lib/teacher/reconcile-keys.ts` (+test), `lib/teacher/notify.ts` (no-op bodies, signatures final), `lib/teacher/CONTRACTS.md`; `lib/database.types.ts` (rows above; `UsageEventType` unchanged); `package.json` (`test:teacher`). Consumes: nothing. Acceptance: three migrations replay on a fresh DB and on a copy of prod; `pnpm test:grants` green including the new `protected`, `service_only`, `write_service_only`, `rpc_allowlist` entries; `select teacher_classroom_ids(auth.uid())` works as `authenticated`; removed/left/archived cases excluded by both RPCs; `student_in_verified_classroom` not executable by `authenticated`; `teacher_digest_last_sent_at` not updatable by a signed-in user; existing teacher pages still render. Tests: `assignment-status.test.ts` (late/extended/excused/left matrix), `subject.test.ts` (Cambridge + IB mappings, null on ambiguity), `reconcile-keys.test.ts`.

### P1 `analytics-core`
Owns: `lib/teacher-analytics.ts`, `lib/teacher-classroom-data.ts`, `lib/teacher/blindspots.ts`, `lib/teacher/cohort-gaps.ts`, `lib/teacher/cohort-due.ts`, `lib/teacher/load-due-rows.ts`, `lib/teacher/class-mastery.ts`, `lib/teacher/review-priority.ts`, `lib/teacher/groups.ts`, `lib/teacher/week.ts`, `lib/teacher/overview.ts` (all + tests). Consumes: §2.4 signatures. Acceptance: no `CAMBRIDGE_9709_SYLLABUS`/`38` constants remain; coverage uses `getTotalSyllabusLeaves(subjectCode)`; a Chemistry classroom returns non-empty blindspots from tagged attempts; attempts before `joined_at` and outside `subject_code` excluded; single blindspot threshold source (`levelFor`); `fetchAllRows` on every cohort read; `getStudentProfiles` uses `teacher_student_profiles`. Tests: `groups.test.ts`, `review-priority.test.ts`, `week.test.ts`, `class-mastery.test.ts`, updated blindspots/cohort tests.

### P2 `assignments-backend`
Owns: `app/api/teacher/classroom/[id]/assignments/**`, `app/api/teacher/question-picker/route.ts`, `lib/teacher/assignments.ts`, `lib/teacher/assignments/{resolve-items,progress,reconcile,print-model}.ts` (+tests), `app/api/mark/process/route.ts`, `app/api/mark/whole-paper/init/route.ts`, `lib/marking/single-question-pipeline.ts` (both insert sites: stamp column only), `lib/marking/mark-return-url.ts` (allow `/dashboard/assignments`), `lib/marking/past-paper-mark-href.ts` (`assignmentItemId`, `returnTo` path), `app/mark/page.tsx` (insert-only: read `assignment`, append `assignment_item_id`, result notice line). Consumes: types, `assignment-status`, `reconcile-keys`, `notify` names. Acceptance: publish → students' `GET /api/assignments` lists it; a mark from `mark_href` stamps `assignment_item_id` and creates a submission; a mark from plain `/mark` on the same question is reconciled within one GET; late/extended computed via `isLate`; whole-paper init stamps the column and still reserves against the student; invalid item → 400, hook no-op without flag; scheme text never in picker response; reconcile skipped under 60s. Tests: `resolve-items.test.ts`, `progress.test.ts`, `reconcile.test.ts` (fixtures incl. legacy null `mark_scheme_id`).

### P3 `class-pages`
Owns: `app/teacher/classroom/[id]/page.tsx`, `.../loading.tsx`, `app/teacher/classroom/[id]/assignments/**`, `app/api/teacher/classroom/[id]/week/route.ts`, `components/teacher/ClassTabs.tsx`, `components/teacher/ClassDeskHead.tsx`, `components/teacher/assignments/{AssignmentComposer,QuestionPicker,TopicPicker,DueDatePicker,AssignmentSlip,CompletionMatrix,ItemGapList,LateList,ReteachCard,WeekStrip,StudentsToWatch,MockDistributionPanel,AssignmentPrintSheet,ErrorGroupsPanel}.tsx`. Consumes: types, P1 `week`/`groups`, P2 loaders, CONTRACTS.md selectors. Acceptance: class page is a server component with one loader call; tabs `aria-current`; matrix renders all six cell states and collapses ≤640px; composer prefills from `?source=&codes=&students=`; print sheet has no nav/shadows; empty and error states per §4; no framer-motion. Tests: matrix cell-state derivation is pure (`components/teacher/assignments/matrix-cells.test.ts`).

### P4 `desk-management`
Owns: `app/teacher/dashboard/**`, `app/teacher/classrooms/**`, `app/teacher/classroom/[id]/settings/**`, `app/api/teacher/classroom/[id]/route.ts`, `.../invite/route.ts`, `.../roster/route.ts`, `.../students/[studentId]/route.ts`, `.../export/route.ts`, `app/api/teacher/classrooms/route.ts`, `app/api/teacher/overview/route.ts`, `app/api/teacher/seed-demo/route.ts`, `app/api/admin/teacher-seats/**`, `app/admin/teacher-seats/**`, `lib/teacher/list-classrooms.ts`, `lib/teacher/export-csv.ts` (+test), `lib/teacher/seat-grant.ts` (+test), `scripts/grant-teacher-seat.ts` (thin CLI), `components/teacher/{TeacherDashboardClient,NeedsYouStrip,ClassSlipList,ClassroomSettingsForm,InviteCard,TeacherSeatRequestCard,RosterList}.tsx`, `lib/email/notifications.ts` (declined-seat email). Consumes: types, P1 `overview`, `notify.auditLog`. Acceptance: rename/archive/delete/regenerate/remove work with confirm dialogs and audit rows; delete refused unless archived and empty; roster names come from the RPC; CSV has no email column and excludes non-active members; demo button hidden in production; admin page gated per-page; declined teachers see the reason. Tests: `export-csv.test.ts`, `seat-grant.test.ts`.

### P5 `reviews-feedback`
Owns: `app/teacher/reviews/**`, `app/api/teacher/reviews/**`, `app/api/teacher/attempt/**`, `lib/teacher/override-validate.ts` (+test), `lib/teacher/reviews-query.ts`, `lib/teacher/feedback.ts`, `components/teacher/{ReviewConsole,OverrideConsole,FeedbackComposer,ReviewQueueList,ReviewFilters}.tsx`. Consumes: types, P1 `review-priority`, `notify.onOverrideSaved/onFeedbackSaved/auditLog`, RPC names. Acceptance: all §6 validation cases return 400 with `field`; confirm/flag do not touch `attempts`; second override keeps the first AI snapshot; `student_visible=false` rows invisible to the student; detail page 404s cleanly; `OverrideConsole` surfaces HTTP errors; inbox paginates with keyset and filters by class/student/set/status; names via RPC. Tests: `override-validate.test.ts` (mark_id set mismatch, bounds, banded scripts, html stripping), `reviews-query.test.ts` (cursor encoding).

### P6 `student-side`
Owns: `app/dashboard/assignments/**`, `app/api/assignments/**`, `app/api/feedback/read/route.ts`, `app/api/classrooms/**` (by-code, join, leave, mine), `lib/rate-limit.ts` (`invite_lookup_count` + `consumeInviteLookupSlot`), `app/join/**`, `components/join/**`, `components/dashboard/{AssignmentsSetCard,TeacherFeedbackNote}.tsx`, `components/account/MyClassesCard.tsx`, `lib/student/assignments.ts` (server-only), `lib/settings/load-account-data.ts`, `app/account/privacy/**` (export additions); insert-only edits to `app/dashboard/page.tsx`, `app/dashboard/attempt/[id]/page.tsx`, `app/account/page.tsx`. Consumes: types, P2 `studentMarkHref`, RPCs. Acceptance: join page shows the retention statement before enrol and rate-limits atomically (429/503 paths); leave uses the RPC and hides the class immediately; a student never sees another student's name or a class average by default; feedback marked read on view; privacy export includes the new tables; `/dashboard` section hidden with no open sets. Tests: `lib/student/assignments.test.ts` (state derivation), rate-limit counter allowlist test.

### P7 `insights-omni`
Owns: `app/api/teacher/classroom/[id]/{analytics,blindspots,quadrants,due,gaps,groups}/route.ts`, `app/api/teacher/classroom/[id]/students/route.ts` (delete), `.../students/[studentId]/{due,history}/route.ts`, delete `app/api/teacher/classroom/[id]/intervention/**`, `app/teacher/classroom/[id]/{gaps,students}/**`, `components/teacher/{ClassBlindspots,GradeRiskMatrix,QuadrantTooltip,ClassDueList,StudentDueList,StudentCard,ClassroomSummary,StudentAttemptHistory,StudentAssignmentRecord,StudentHead}.tsx`, delete `components/teacher/InterventionGenerator.tsx`, `lib/omni-ai/system-prompts.ts` (teacher case), `lib/omni-ai/teacher-context.ts` (`buildOmniClassContext`, +test), `app/api/omni-ai/route.ts` (teacher branch only), `components/omni-ai/OmniAI.tsx` (teacher prompt chips only). Consumes: P1 libs, types. Acceptance: routes subject-scoped; `GradeRiskMatrix` has no framer, dots link to students, untimed labelled; student detail is server-rendered and never downloads the whole class; `view_student` audited; Omni ignores client `context.data` for teachers (test: injected text absent from prompt), names via `displayName`, off-origin CTA dropped. Tests: `teacher-context.test.ts`.

### P8 `notify-email-crons`
Owns: `lib/teacher/notify.ts` (fills the P0 stubs; signatures unchanged), `lib/teacher/{digest,reminders}.ts`, `lib/email/{assignment-set,assignment-due,teacher-feedback,teacher-digest}.ts` (their tests live under `lib/teacher/email/*.test.ts` so the `test:teacher` glob picks them up without editing `package.json`), `app/api/cron/{teacher-digest,assignment-reminders}/route.ts`, `vercel.json`, `lib/community/email-unsubscribe.ts`. Consumes: types, P2 `reconcileAssignment`. Acceptance: dry-run flags log without sending; suppressions and prefs honoured; unsubscribe links for both new kinds verify; digest guard prevents double send; submission notifications coalesce per assignment/day; `onOverrideSaved` sets `reviewed` and best-of marks. Tests: `digest.test.ts` (guard + content), `reminders.test.ts` (24h window, excused/extended skipped), unsubscribe kinds test.

### P9 `billing`
Owns: `lib/billing/{caps,enforcement,access}.ts`, `lib/billing/teacher-seat.ts` (+test), `lib/billing/caps.test.ts`, `app/api/auth/check/route.ts`, `components/billing/{BillingLimitBanner,CreditChip}.tsx`, `docs/CODE_REVIEW_2026-09-25.md` (§67/§82/§88 closure notes). Consumes: `student_in_verified_classroom` RPC. Acceptance: eligible free student's cap = 5 + 20; paid student's cap unchanged + 20; teacher unaffected; `reserve_mark_usage` called with the raised cap only; `auth/check` returns `teacherVerified`; all five call sites use `teacherVerifiedAt`. Tests: `caps.test.ts` (bonus matrix), `teacher-seat.test.ts`.

### P10 `chrome-design`
Owns: `app/teacher/{layout,loading,error,not-found}.tsx`, `components/teacher/{TeacherNav,TeacherTabBar,TeacherPageChrome}.tsx`, `lib/design-system/teacher.css`, `lib/design-system/mobile-refinements.css` (teacher block), `lib/site-chrome.ts`, `lib/auth-gates.ts`, `lib/site-nav.ts`, `proxy.ts`, `app/robots.ts`, `app/(marketing)/(chrome)/for-teachers/**`, `app/(marketing)/(bare)/for-teachers/start/**`, `components/teacher/TeacherStartForm.tsx`, `lib/seo/for-teachers-seo.ts`, changelog entry, `docs/teacher-system.md`. Consumes: CONTRACTS.md selector list. Acceptance: every manifest selector defined with tokens only (no hex, no blur, 4px radius); dead blocks `ms-teacher-print-hide/blindspot/review/inbox-filters` removed after P3/P5 confirm non-use; tab bar ≤900px with safe-area; `not-found.tsx` renders inside the teacher frame; nav shows Desk/Classes/Reviews + bell under the flag; marketing copy matches product. Tests: none beyond lint/build; visual check in both themes.

Order: P0 → P1 + P10 (day one) → P2, P4, P9 → P3, P5, P6, P7, P8. P3 and P5 may start against P0 types with fixtures; P8 fills `notify.ts` after P2's `reconcileAssignment` exists.
