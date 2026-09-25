# Teacher system v2 — contracts

The page every v2 package codes against. It restates the fixed interfaces
from `docs/TEACHER_SYSTEM_SPEC.md` (§2.2–§2.6, §3, §10) **as landed by P0
`contracts`**, and records every place P0 had to rule on something the spec
left open or got wrong. Where this file and the spec disagree, this file wins
(it was checked against the migrations as they actually replay, on Postgres 16
with Supabase's roles and default privileges); where this file is silent, the
spec wins.

If you need a change to anything below, do not edit it from your package:
put it in your handoffs.

---

## 0. What P0 landed, and the rulings other packages must know

| File | What it is |
|---|---|
| `supabase/migrations/20260926a_teacher_v2_classrooms.sql` | classroom columns, membership `status` + service-only membership writes, the three RLS helpers, profile RPCs, `leave_classroom`, `student_in_verified_classroom`, `rate_limits.invite_lookup_count` |
| `supabase/migrations/20260926b_teacher_v2_assignments.sql` | `assignments`, `assignment_items`, `assignment_students`, `assignment_submissions`, `attempts.assignment_item_id` (+ column-grant lockdown), `targeted_assignment_ids` |
| `supabase/migrations/20260926c_teacher_v2_feedback_audit.sql` | `teacher_overrides` decision columns, `teacher_feedback`, `mark_teacher_feedback_read`, `teacher_audit_log`, `user_profiles` email prefs + digest guard, `audit_client_grants()` |
| `lib/teacher/types.ts` | §2.1 verbatim. Types only; import it anywhere. |
| `lib/teacher/assignment-status.ts` (+test) | lateness, per-student state, class summary, set status |
| `lib/teacher/subject.ts` (+test) | `resolveClassroomSubjectCode`; re-exports `displayName` |
| `lib/teacher/display-name.ts` (+test) | `displayName` — dependency-free, safe in client components |
| `lib/teacher/flags.ts` (+test) | `isTeacherV2()` |
| `lib/teacher/reconcile-keys.ts` (+test) | attempt ↔ item fallback keys |
| `lib/teacher/notify.ts` | §2.3 signatures; `auditLog` is **live**, the rest are no-ops P8 fills |
| `lib/database.types.ts` | row types for the new tables/columns (`Classroom` now comes from `lib/teacher/types.ts`) |
| `scripts/backfill-classroom-subject.ts` | `npx tsx scripts/backfill-classroom-subject.ts [--apply]` after 20260926a |
| `package.json` | `test:teacher` (see §9), appended to `test` |

Rulings (read these before building on the schema):

1. **Migration names** are `20260926a/b/c_*` (not `20261001*`) so they sort after the
   `20260925_*` files whose RPCs they extend. `bump_rate_limit` / `refund_rate_limit`
   are redefined verbatim with `'invite_lookup_count'` appended to both allowlists.
2. **`isTeacherV2()` is ON unless `TEACHER_V2` is exactly `'0'`** (whitespace-trimmed).
   Server-only in practice: `TEACHER_V2` is not `NEXT_PUBLIC_`, so evaluate it in a
   server component/route and pass the boolean down.
3. **RLS recursion fixed.** The spec's `assignment_student_read` queried
   `assignment_students` inline; with `assignment_students_teacher_all` querying
   `assignments`, Postgres rejects every query on both tables ("infinite recursion
   detected in policy" — reproduced on PG16). The policy now uses
   `targeted_assignment_ids(auth.uid())`, a SECURITY DEFINER helper returning the
   caller's own `assignment_students.assignment_id`s. It is in `rpc_allowlist`.
4. **`assignment_items.mark_scheme_id` can be null on a `past_paper_question`** — only
   after its `mark_schemes` row is deleted (FK `on delete set null`; the spec's NOT NULL
   check would have made that delete fail). The row keeps `paper_code/paper_session/
   question_number`, so reconciliation falls back to `legacyItemKey(item)`.
   `resolveItems` must still always write `mark_scheme_id` on insert.
5. **All new policies are `TO authenticated`** and `anon` holds no privileges on any new
   table. Nothing in v2 is readable anonymously; anon routes (`/api/classrooms/by-code`)
   use the service client.
6. **`attempts.assignment_item_id` is service-role only.** Clients' table-wide
   INSERT/UPDATE on `attempts` was replaced by per-column grants on every other column,
   so existing client writes are unaffected. Every attempts write in the app today uses
   the service client anyway; stamp the column only there, after
   `validateAssignmentItemForStudent`.
7. **`assignment_submissions`: clients SELECT only** (RLS), all writes via the service
   client. **`teacher_feedback`: no client UPDATE** — teachers insert/delete (edit =
   delete + insert), `read_at` only via `mark_teacher_feedback_read`. The feedback
   WITH CHECK also requires `attempt_id` to belong to `student_id`.
8. **`teacher_overrides.supersedes_override_id` is `on delete set null`** (otherwise
   deleting one teacher's account could be blocked by another teacher's later override).
   The new teacher policy only accepts attempts of the caller's *current* students.
9. **`teacher_audit_log` is append-only**: service_role has SELECT/INSERT/DELETE, no
   UPDATE. Write it only through `auditLog()`.
10. **`teacher_roster_profiles` is a left join** on `user_profiles`: a member with no
    profile row still appears (null name) rather than vanishing from the roster.
11. **`user_classroom_ids` / `teacher_classroom_ids` keep production's argument names**
    (read from the catalogue at migration time) and refer to the argument as `$1`.
    Call them positionally: `user_classroom_ids(auth.uid())`.
12. **`audit_client_grants()`** copies the latest body (20260925_community_votes_rpc.sql,
    which mirrors production: creators entries in, `classroom_join_attempts` out) and adds: `protected` +=
    `user_profiles.teacher_digest_last_sent_at`, `attempts.assignment_item_id`;
    `service_only` += `teacher_audit_log`; new `write_service_only` =
    `['assignment_submissions', 'classroom_memberships']`; new `update_service_only` =
    `['teacher_feedback']`;
    `rpc_allowlist` += `teacher_roster_profiles`, `teacher_student_profiles`,
    `leave_classroom`, `mark_teacher_feedback_read`, `targeted_assignment_ids`.
    Any new SECURITY DEFINER function you add must be revoked `from public` or added
    there (with the reason) in a later migration.
13. **`studentMarkHref` is synchronous** — §2.5 writes `async … : string`, which is not
    valid TypeScript. Implement `export function studentMarkHref(item, assignmentId): string`.
14. **Set status auto-closes** `AUTO_CLOSE_AFTER_DUE_DAYS` (7) days after `due_at` (see §2).
    Use `assignmentStatus` / `effectiveCloseAt` everywhere; do not re-derive.
15. **`classroom_memberships` is written only by the service role.** The spec kept
    `membership_teacher_manage` (FOR ALL); with a self-declared `role`, that let any
    signed-in user create a class, INSERT a membership for any user id and read all of
    that user's attempts, or backdate `joined_at` / reactivate a student who left
    (reproduced). It is replaced by `membership_teacher_read` (SELECT, every status) and
    client INSERT/UPDATE/DELETE grants are revoked (enforced by `write_service_only`).
    Join, remove, rejoin and seed-demo therefore use the service client *after* the
    route has proven ownership/eligibility; leaving uses `leave_classroom()`; deleting a
    classroom still cascades.

---

## 1. Database contract

### Tables and columns (all RLS-enabled)

| Table | Client access | Notes |
|---|---|---|
| `classrooms` + `subject_code`, `year_group`, `archived_at`, `settings jsonb` | teacher: ALL own (unchanged); student: SELECT via `user_classroom_ids` (re-asserted, so left/removed/archived hide the class) | `settings` must be a JSON object; keys `notify_submissions: 'daily'\|'off'`, `demo: boolean`, `student_can_see_class_avg: boolean` (default false). `subject_code` is a `lib/syllabi` registry key or null (≤64 chars); `year_group` ≤40 chars. |
| `classroom_memberships` + `status`, `removed_at`, `removed_by`, `left_at` | teacher: SELECT (all statuses, own classes); student: SELECT own; **no client writes** (ruling 15) | `status ∈ active\|removed\|left`. Remove = service update `status='removed', removed_at=now(), removed_by=teacherId`. Never DELETE a membership to remove a student. |
| `assignments` | teacher: ALL own (WITH CHECK: classroom ∈ `teacher_classroom_ids`); student: SELECT published, not archived, active member, (`target='all'` or targeted) | `updated_at` maintained by trigger `trg_touch_assignment`. `settings`/`source_ref` must be objects. |
| `assignment_items` | teacher: ALL on own sets; student: SELECT items of visible sets | shape CHECK `assignment_items_shape` (see ruling 4); `position ≥ 0`, unique per set |
| `assignment_students` | teacher: ALL on own sets (WITH CHECK: student ∈ `teacher_student_ids`); student: SELECT own | `feedback ≤2000`, plain text |
| `assignment_submissions` | SELECT only — teacher: own sets ∩ current students; student: own | service-role writes; unique `(item_id, student_id)`; `attempt_count ≥ 1` |
| `attempts.assignment_item_id` | not writable by any client role | FK `on delete set null`; index `(assignment_item_id, user_id)` |
| `teacher_overrides` + `decision`, `student_visible`, `supersedes_override_id`, `classroom_id`, `reasoning_note` | teacher: ALL own (WITH CHECK: attempt of a current student); student: SELECT own where `student_visible` | `decision` default `'override'` for historic rows |
| `teacher_feedback` | teacher: SELECT/INSERT/DELETE own (WITH CHECK: current student, attempt is theirs, classroom is the teacher's); student: SELECT own | no client UPDATE |
| `teacher_audit_log` | none | service-role only, append-only; `action` CHECK = the eight §8 actions; `meta` must be an object |
| `user_profiles` + `email_assignments`, `email_teacher_digest` (client-writable), `teacher_digest_last_sent_at` (service only) | column grants | |
| `rate_limits.invite_lookup_count` | none (service) | bucket for `bumpRateLimit(admin, key, 'invite_lookup_count', n)` |

### RPCs

| Function | Callable by | Returns / does |
|---|---|---|
| `teacher_student_ids(uid)` | authenticated (RLS helper) | active members of the caller's non-archived classes; empty unless `uid = auth.uid()` |
| `user_classroom_ids(uid)` | authenticated (RLS helper) | caller's active memberships of non-archived classes |
| `teacher_classroom_ids(uid)` | authenticated (RLS helper) | every classroom the caller teaches, archived included |
| `targeted_assignment_ids(uid)` | authenticated (RLS helper) | assignment ids the caller has an `assignment_students` row on |
| `teacher_roster_profiles(p_classroom_id uuid)` | authenticated | `table(id, full_name, board, level, joined_at, status)` — every membership status; empty unless the caller teaches the class |
| `teacher_student_profiles(p_student_ids uuid[])` | authenticated | `table(id, full_name, board, level)` for those ids that are the caller's current students (active, non-archived class). **The only cross-user profile read** besides the roster RPC — never select another user's `user_profiles` row. For an archived class, or to name a student who has left, use `teacher_roster_profiles`. |
| `leave_classroom(p_classroom_id uuid)` | authenticated | void; flips the caller's own *active* membership to `left` |
| `mark_teacher_feedback_read(p_ids uuid[])` | authenticated | void; sets `read_at` on the caller's own unread rows among `p_ids` |
| `student_in_verified_classroom(p_user_id uuid)` | **service_role only** | boolean: active member of a non-archived class whose teacher has `teacher_verified_at` |
| `bump_rate_limit` / `refund_rate_limit` | service_role only | unchanged signatures; `'invite_lookup_count'` now allowed |

Supabase JS: `supabase.rpc('teacher_roster_profiles', { p_classroom_id })`,
`supabase.rpc('teacher_student_profiles', { p_student_ids })`,
`supabase.rpc('leave_classroom', { p_classroom_id })`,
`supabase.rpc('mark_teacher_feedback_read', { p_ids })`,
`admin.rpc('student_in_verified_classroom', { p_user_id })`.

---

## 2. Pure helpers (§2.2)

All pure, all tested (`lib/teacher/*.test.ts`), safe on client and server
unless noted.

```ts
// lib/teacher/assignment-status.ts
export const AUTO_CLOSE_AFTER_DUE_DAYS = 7
export const HANDED_IN_STATES: ReadonlySet<StudentItemState>          // done | late | reviewed
export function effectiveDueAt(dueAt: string | null, extendedDueAt: string | null): string | null
export function isLate(submittedAt: string, dueAt: string | null, extendedDueAt: string | null): boolean
export function deriveStudentState(input: { membership: MembershipStatus; items: AssignmentItem[]; submissions: AssignmentSubmission[];
  flags: AssignmentStudentFlags | null; due_at: string | null }): Omit<StudentAssignmentState, 'student_id' | 'display_name'>
export function summariseProgress(states: StudentAssignmentState[], items: AssignmentItem[]): Omit<AssignmentProgress, 'assignment_id' | 'students'>
export function effectiveCloseAt(a: Pick<Assignment, 'closed_at' | 'due_at'>): string | null
export function assignmentStatus(a: Pick<Assignment, 'published_at' | 'closed_at' | 'archived_at' | 'due_at'>, now?: Date): 'draft' | 'open' | 'closed'
```

Semantics every surface must share:

- **Deadline** = the *later* of `due_at` and `extended_due_at` (an extension never shortens it).
  **Late** = first hand-in strictly after the deadline; exactly on it is on time; no deadline → never late.
- Lateness is derived from `first_submitted_at`, not the stored `status`, so an extension granted
  afterwards clears it. The stored status only matters for `'reviewed'`.
- Item state precedence: a submission → `reviewed` | `late` | `done`; otherwise `left` (membership not
  active) → `excused` → `missing`. Work handed in outranks every flag.
- `overall_pct` = Σearned / Σtotal over handed-in items with a known total (item total is the fallback),
  one decimal place; null when there is none. `is_late` = any handed-in item was late.
- `summariseProgress`: each student is in exactly one of `handed_in` (every item handed in) → `left` →
  `excused` → `missing` (includes part-way); `late` is an overlay (students with any late hand-in).
  `class_mean_pct` = mean of students' `overall_pct`; `per_item` in `position` order over hand-ins only.
- `assignmentStatus`: `draft` if unpublished; `closed` if archived or `now ≥ effectiveCloseAt`
  (= earlier of `closed_at` and `due_at + 7 days`); else `open`. A set past due but inside the 7 days
  is `open` — that is where "late" lives. Late hand-ins after close are still accepted when
  `settings.allow_late !== false`.

```ts
// lib/teacher/subject.ts   (server or client; pulls in the syllabus registry)
export function resolveClassroomSubjectCode(board: string, level: string, subject: string): string | null
export { displayName, DISPLAY_NAME_FALLBACK } from '@/lib/teacher/display-name'

// lib/teacher/display-name.ts   (dependency-free — import THIS from client components)
export const DISPLAY_NAME_FALLBACK = 'Student'
export const MAX_FIRST_NAME_CHARS = 24
export function displayName(fullName: string | null, fallback?: string): string   // "Amira K."
```

- `resolveClassroomSubjectCode` returns only `lib/syllabi` registry keys, and null on any ambiguity
  (Cambridge name without a level, IB name without HL/SL, a code with no syllabus tree such as 4024,
  non-Cambridge boards, contradictory rows). An `ib-*` subject code wins over a default-looking
  (Cambridge/empty) board, because the classrooms columns default to Cambridge/A-Level.
- `displayName` is **the only formatter allowed into AI prompts, emails and notifications**. It
  keeps letters, marks, apostrophes and hyphens only (tags stripped, NFKC-folded), first word capped
  at 24 characters, plus the last word's initial. Pass `'Your teacher'` (or similar) as `fallback`
  where "Student" would be wrong. Full names remain fine in teacher UI.

```ts
// lib/teacher/flags.ts
export function isTeacherV2(): boolean       // true unless process.env.TEACHER_V2?.trim() === '0'

// lib/teacher/reconcile-keys.ts
export function legacyAttemptKey(a: { mark_schemes?: SchemeRef | SchemeRef[] | null }): string | null   // 'q:paper|session|qn'
export function legacyItemKey(item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session' | 'question_number'>): string | null
export function wholePaperAttemptKey(a: { ai_marking?: unknown }): string | null                    // 'p:paper|session' from ai_marking
export function wholePaperItemKey(item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session'>): string | null
```

Reconciliation order (P2): `attempts.assignment_item_id` stamp → `mark_scheme_id` equality →
`legacyAttemptKey(attempt) === legacyItemKey(item)` (for items whose scheme id is null) → whole paper
via stamp or `wholePaperAttemptKey === wholePaperItemKey`. The question key is byte-identical to
`lib/plan`'s `blockEvidenceKey` (tested). Values are trimmed, not case-folded.

---

## 3. `lib/teacher/notify.ts` (§2.3) — `import 'server-only'`

```ts
export type { TeacherAuditAction }            // from lib/database.types.ts
export type TeacherAuditEntry = { actorId: string; classroomId?: string | null; studentId?: string | null;
  action: TeacherAuditAction; meta?: Record<string, unknown> }
export async function notifyAssignmentPublished(assignmentId: string): Promise<void>
export async function notifySubmission(input: { assignmentId: string; studentId: string; attemptId: string }): Promise<void>  // batched per assignment/day
export async function notifyRemind(assignmentId: string, studentIds: string[]): Promise<number>
export async function onOverrideSaved(attemptId: string): Promise<void>      // recompute submission (status 'reviewed', marks), notify student if visible
export async function onFeedbackSaved(feedbackId: string): Promise<void>
export async function auditLog(entry: TeacherAuditEntry): Promise<void>
```

- None of them throw; failures are logged. Await them or pass them to `after()`. The notification
  functions are safe to repeat for the same event; `auditLog` appends a row per call, so call it
  once per action, after the action succeeded.
- **`auditLog` is live now** (service insert into `teacher_audit_log`). Call it for every §8 action:
  `view_student`, `export_csv`, `override`, `feedback`, `remove_student`, `regenerate_code`,
  `archive_classroom`, `delete_classroom`. `meta` must be a plain object (DB CHECK).
- The other five are no-ops (`notifyRemind` returns 0) until P8 fills them; their doc comments in
  the file are the behaviour P8 implements. P8: keep `auditLog` as is.

---

## 4. Analytics / loader signatures (§2.4 — implemented by P1 `analytics-core`)

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

---

## 5. `lib/teacher/assignments.ts` (§2.5 — server-only; implemented by P2 `assignments-backend`)

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

(See ruling 13: `studentMarkHref` is synchronous.)

---

## 6. Routes (§3)

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

## 7. CSS selector and component manifest (§2.6)

Selectors — **owned by P10 `chrome-design`** (defined in `lib/design-system/teacher.css`, tokens
only: no hex, no blur, 4px radius, 44px touch targets); everyone else uses them and does not
redefine them:

| Selector | Used by |
|---|---|
| `.ms-teacher-tabs` | `ClassTabs` (class page tabs, `aria-current`) |
| `.ms-teacher-tabbar` | `TeacherTabBar` (≤900px bottom bar) |
| `.ms-needs-you` | `NeedsYouStrip` |
| `.ms-set-slip` | `AssignmentSlip`, `WeekStrip` rows |
| `.ms-set-composer` | `AssignmentComposer` |
| `.ms-set-matrix` | `CompletionMatrix` |
| `.ms-set-matrix__cell`, `--done`, `--late`, `--reviewed`, `--missing`, `--excused`, `--left` | matrix cells — one modifier per `StudentItemState` |
| `.ms-reteach` | `ReteachCard` |
| `.ms-students-watch` | `StudentsToWatch` |
| `.ms-feedback-note` | `FeedbackComposer` preview, `TeacherFeedbackNote` |
| `.ms-review-console` | `ReviewConsole` |
| `.ms-review-filters` | `ReviewFilters` |
| `.ms-my-classes` | `MyClassesCard` |
| `.ms-assign-card` | `AssignmentsSetCard` |
| `.ms-error-group` | `ErrorGroupsPanel` |
| `.ms-teacher-print` | `AssignmentPrintSheet` (print sheet; no nav/shadows) |

Existing selectors §4 also relies on (already in `teacher.css`; keep using them):
`.ms-teacher-layout`, `.ms-teacher-empty` (+`__icon`, `__title`, `__body`), `.ms-teacher-error`
(with `role="alert"`), `.ms-teacher-class-slip` (+`__stamp`, `__name`, `__meta`, `__code`, `__go`),
`.ms-teacher-desk-head` (+`__note`), `.ms-teacher-demo-flag`, `.ms-teacher-tally` (+`__cell`,
`__label`, `__value`), `.ms-class-due__bar` (+`__fill`), `.ms-gap-track` (+`.ms-gap-fill`,
`.ms-gap-row`), `.ms-teacher-invite`, `.ms-teacher-roster`. §4 also names `.ms-review-slip`
(review queue rows), which P10 defines alongside the manifest. Shared primitives: `.ec-exam-sheet`,
`.ec-scheme-cite`, `.ec-chip-warning`, `.ec-tabbar`, `.ec-stamp-in`.

Component exports (named exports, one component per file):

| Component | Package | File |
|---|---|---|
| `ClassTabs` | P3 | `components/teacher/ClassTabs.tsx` |
| `ClassDeskHead` | P3 | `components/teacher/ClassDeskHead.tsx` |
| `NeedsYouStrip` | P4 | `components/teacher/NeedsYouStrip.tsx` |
| `ClassSlipList` | P4 | `components/teacher/ClassSlipList.tsx` |
| `WeekStrip` | P3 | `components/teacher/assignments/WeekStrip.tsx` |
| `ReteachCard` | P3 | `components/teacher/assignments/ReteachCard.tsx` |
| `StudentsToWatch` | P3 | `components/teacher/assignments/StudentsToWatch.tsx` |
| `CompletionMatrix` | P3 | `components/teacher/assignments/CompletionMatrix.tsx` |
| `AssignmentComposer` | P3 | `components/teacher/assignments/AssignmentComposer.tsx` |
| `ErrorGroupsPanel` | P3 | `components/teacher/assignments/ErrorGroupsPanel.tsx` |
| `ReviewConsole` | P5 | `components/teacher/ReviewConsole.tsx` |
| `FeedbackComposer` | P5 | `components/teacher/FeedbackComposer.tsx` |
| `AssignmentsSetCard` | P6 | `components/dashboard/AssignmentsSetCard.tsx` |
| `TeacherFeedbackNote` | P6 | `components/dashboard/TeacherFeedbackNote.tsx` |
| `MyClassesCard` | P6 | `components/account/MyClassesCard.tsx` |

---

## 8. Ownership map (§10)

Edit only what your package owns; anything else goes in your handoffs. P0's migration names are
the `20260926a/b/c` files above (the spec's `20261001*` names are superseded). P6 deletes
`supabase/migrations/20260925_classroom_join_attempts.sql` (never applied) when it moves to
`invite_lookup_count`; the latest audit body (20260925_community_votes_rpc.sql) already dropped
its `service_only` entry, and 20260926c follows it.
P0 additionally owns `lib/teacher/display-name.ts` (+test) and `lib/teacher/flags.test.ts`.

### P0 `contracts` — lands first
Owns: `supabase/migrations/20260926a_teacher_v2_classrooms.sql`, `20260926b_teacher_v2_assignments.sql`, `20260926c_teacher_v2_feedback_audit.sql`; `scripts/backfill-classroom-subject.ts`; `lib/teacher/types.ts`, `lib/teacher/assignment-status.ts` (+test), `lib/teacher/subject.ts` (+test), `lib/teacher/flags.ts`, `lib/teacher/reconcile-keys.ts` (+test), `lib/teacher/notify.ts` (no-op bodies, signatures final), `lib/teacher/CONTRACTS.md`; `lib/database.types.ts` (rows above; `UsageEventType` unchanged); `package.json` (`test:teacher`). Consumes: nothing. Acceptance: three migrations replay on a fresh DB and on a copy of prod; `pnpm test:grants` green including the new `protected`, `service_only`, `write_service_only`, `rpc_allowlist` entries; `select teacher_classroom_ids(auth.uid())` works as `authenticated`; removed/left/archived cases excluded by both RPCs; `student_in_verified_classroom` not executable by `authenticated`; `teacher_digest_last_sent_at` not updatable by a signed-in user; existing teacher pages still render. Tests: `assignment-status.test.ts` (late/extended/excused/left matrix), `subject.test.ts` (Cambridge + IB mappings, null on ambiguity), `reconcile-keys.test.ts`.

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

---

## 9. Tests and env

- `pnpm test:teacher` runs `tsx --test` over `lib/teacher/**/*.test.ts`,
  `components/teacher/**/*.test.ts` and `lib/student/**/*.test.ts`; `pnpm test` runs it last.
  Add a `*.test.ts` beside your code under those paths and it is picked up — no `package.json`
  edit. Tests are plain `node:assert/strict` scripts (see `lib/teacher/invite-code.test.ts`);
  each file runs in its own process, must exit non-zero on failure, and should end with a
  one-line `console.log`.
- The runner uses `NODE_OPTIONS=--conditions=react-server` (as `test:billing` / `test:email`
  do), so a test may import a module that has `import 'server-only'` (e.g. `lib/student/
  assignments.ts`). It may **not** import a `'use client'` component module or anything that
  pulls in `client-only` / React client hooks — put the logic you test in a pure `.ts` module
  (e.g. `components/teacher/assignments/matrix-cells.ts`) and test that. Tests must not need
  network or database credentials.
- `pnpm test:grants` (live DB) must stay green; it fails on any row `audit_client_grants()` returns.
- Env: `TEACHER_V2` — optional; `'0'` switches v2 off. (P8/P9 add their own: see the spec §5, §7.)
