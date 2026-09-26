# Teacher system

How the teacher side of MarkScheme fits together, for whoever works on it next.
The build spec is `docs/TEACHER_SYSTEM_SPEC.md`; the interfaces every package
codes against are in `lib/teacher/CONTRACTS.md`. This page is the map: what
exists, where it lives, and the rules that are easy to break.

## In one paragraph

A teacher creates a class and reads its six-letter code to the room. Students
join at `/join/[code]` (after being told what the teacher will see). The
teacher sets work — past-paper questions, a whole paper, a topic drill or a
prompt — and students mark their handwriting from the set's link. Each mark
becomes a hand-in on the class matrix. The teacher reviews scripts (confirm,
re-mark, flag), leaves feedback, and reads the gap the class shares on the
desk, the class week and the Sunday digest.

## Switch

`TEACHER_V2` — v2 is **on** unless the variable is exactly `0`
(`lib/teacher/flags.ts`). It is a server variable: read it in a server
component or route and pass the boolean down. With it off, the teacher nav
falls back to Classrooms · Reviews and the phone tab bar is not rendered.

## The frame (`app/teacher/layout.tsx`)

| Piece | File | Notes |
|---|---|---|
| Header | `components/teacher/TeacherNav.tsx` | Desk `DK` · Classes `CL` · Reviews `RV`, bell, theme, `ACC`, `OUT`. Link row hides at ≤900px. |
| Phone tab bar | `components/teacher/TeacherTabBar.tsx` | Desk · Classes · Reviews · Account on the shared `.ec-tabbar`; ≤900px; safe-area insets. |
| Nav items | `lib/site-nav.ts` (`TEACHER_DESK_NAV`, `teacherNavItems`) | One definition for both; `lib/site-nav.test.ts`. |
| Page head | `TeacherDeskHead` in `components/teacher/TeacherPageChrome.tsx` | Eyebrow + stamp, serif title, Caveat note, actions. |
| 404 | `app/teacher/not-found.tsx` | "Not on your desk". Same answer for "missing" and "not yours". |
| Errors | `app/teacher/error.tsx` | Keeps the frame; shows the digest. |
| Loading | `app/teacher/loading.tsx` + per-route `loading.tsx` | Skeleton slips in a `role="status" aria-busy` region. |

Every teacher page renders into the layout's single `<main id="teacher-main">`.
Do not render another `<main>` (or `.app-shell`) inside it.

## Design contract (`lib/design-system/teacher.css`)

Tokens only (no hex, no rgba literals, no blur), 4px radius, 44px targets,
both themes from the shared tokens. Green is done/awarded, crimson is
late/missing/danger. Each block in the file starts with a one-line comment and
a markup example; the manifest blocks are:

| Selector | For |
|---|---|
| `.ms-teacher-tabs` (`__tab`, `__count`) | class section tabs, `aria-current="page"` on the open one |
| `.ms-teacher-tabbar` | the phone bar, on `.ec-tabbar` |
| `.ms-needs-you` (`__tile--urgent/--clear`, `__count`, `__label`, `__hint`) | desk "Needs you" strip |
| `.ms-set-slip` (`--draft/--closed/--mock`, `__stamp`, `__title`, `__meta`, `__due--late`, `__late`, `__tally`) | a set as a slip; progress bar is `.ms-class-due__bar` with `__fill--done/--late/--missing` |
| `.ms-set-composer` (`__step`, `__pick[aria-pressed]`, `__chip`, `__review`, `__allowance`, `__actions`) | set-work composer |
| `.ms-set-matrix` (`__scroll`, `__table`, `__student`, `__slips`) and `.ms-set-matrix__cell--done/--late/--reviewed/--missing/--excused/--left` | completion matrix; slips replace the table ≤640px |
| `.ms-reteach` | the reteach card (dual-ink rule) |
| `.ms-students-watch` (`__group--silent/--struggling/--improving`) | students to watch |
| `.ms-feedback-note` | a teacher's handwritten note |
| `.ms-review-console` (`__stamp--confirm/--override/--flag`, `__mark[aria-pressed]`) | review console |
| `.ms-review-filters` | GET-form filters |
| `.ms-review-slip` (+ `.ms-review-queue`) | review queue rows — scoped to `.ms-teacher-layout`, because `.ms-review-slip` is also the student dashboard's card |
| `.ms-my-classes` | account → my classes |
| `.ms-assign-card` | dashboard → set by your teacher |
| `.ms-error-group` | students sharing one mistake |
| `.ms-teacher-print` | print sheet on `.ec-exam-sheet`; `@media print` hides the frame |

Shared helpers also defined there: `.ms-teacher-chip` (`--left/--removed/--demo/--mock/--due/--draft/--archived`),
`.ms-teacher-archived-banner`, `.ms-teacher-section-title`, `.ms-teacher-settings`,
`.ms-teacher-danger`, `.ms-teacher-allowance`, `.ms-teacher-confirm__*`,
`.ms-teacher-archive` (the archived disclosure) and `.ms-seat-queue`.

## Desk and classes

- `/teacher/dashboard` — `TeacherOverview` from `lib/teacher/overview.ts`
  (loaded once): Needs you (scripts to review, students overdue, classes gone
  quiet), class slips, archived classes under a disclosure, the seat card.
- `/teacher/classrooms` — the same slips with invite codes, keyset-paginated.
- `/teacher/classroom/[id]/settings` — details (name, note, year group,
  syllabus, hand-in alerts, class-average visibility), invite code with "New
  code", the class list with Remove, CSV export, archive / restore / delete.

Class lifecycle, enforced by the routes (`app/api/teacher/classroom/[id]`):

1. **Archive** (`DELETE ?mode=archive`) — reversible. The class leaves both
   RLS helpers: students stop seeing it, nobody can join, the teacher stops
   seeing new work. Settings become read-only.
2. **Restore** (`PATCH {archived:false}`) — the undo.
3. **Delete** (`DELETE ?mode=delete`) — only when archived **and** no active
   members; the confirm dialog also asks for the class name. Cascades every
   set and hand-in.

Removing a student flips the membership to `removed` (service client, after
ownership is proven) — never a row delete — and notifies them (`class_removed`).

## Privacy rules that are easy to break

- Cross-user profile reads only through `teacher_roster_profiles` /
  `teacher_student_profiles`. Never select another user's `user_profiles`.
- A teacher sees active members' work **in the class subject, since they
  joined** — use the loaders in `lib/teacher-classroom-data.ts`, which apply
  the rule themselves.
- Names into prompts, emails, notifications and exports go through
  `displayName()` ("Amira K."). Full names are fine in teacher UI.
- Free text is stored as plain text (`plainText()` in
  `lib/teacher/list-classrooms.ts`).
- The service client only after ownership is proven, and only for what RLS
  would wrongly hide (schedule tables, banked question paper codes).
- Audit (`auditLog` in `lib/teacher/notify.ts`), once per successful action:
  `export_csv`, `remove_student`, `regenerate_code`, `archive_classroom`
  (restores carry `meta.restored`), `delete_classroom`; reviews, feedback and
  student views audit their own.

## Exports

`GET /api/teacher/classroom/[id]/export?scope=assignments|attempts` →
CSV (`lib/teacher/export-csv.ts`): active members only, display names only,
no emails, formula-injection-safe cells, UTF-8 BOM, CRLF, 20,000-row ceiling
(signalled with `X-Export-Truncated`). Archived classes are refused, not
exported empty.

## Teacher seats

A seat (`user_profiles.teacher_verified_at`) is the teacher's free allowance
and turns on the class bonus for their students. It is never self-claimed.

- Teachers ask from the desk card (`/api/teacher/seat-request`).
- Admins decide at `/admin/teacher-seats` (gated per page with `isAdminUser`)
  or with `pnpm teacher:grant --pending | --approve <email> | --decline <email> "<reason>"`.
- Both call `applySeatDecision` in `lib/teacher/seat-grant.ts`: the request
  is closed first with a conditional update (one reviewer wins), the seat is
  written only by the winner, then the teacher gets a `seat_decision`
  notification and the approved or declined email. A decline needs a reason —
  the teacher sees it on their desk beside "Apply again".

## Example class

`POST /api/teacher/seed-demo` (never in production) builds a class with
`settings.demo = true`, twelve simulated students, a month of marks and one
published set due two days ago with on-time, late, part-done, excused and
missing hand-ins. A teacher with a live example class gets it back instead of
a second one. Every page flags it from `settings.demo`, never from its name.

## Sets and hand-ins

A student opens a set item's link (`studentMarkHref`), which carries
`/mark?assignment=<item id>`. `/api/mark/process` and
`/api/mark/whole-paper/init` validate the item for that student and stamp
`attempts.assignment_item_id` (service role only); the mark result (or the
whole-paper init response) carries `_assignment`, which `/mark` shows as
"Linked to <set> — your teacher can see this mark"
(`components/mark/AssignmentLinkNotice.tsx`). The hand-in is written when the
mark finishes (`onAttemptsMarked`, from `process` and `whole-paper/run`). A
mark of the same question from plain `/mark` is matched later by
`reconcileAssignment` — on the set page, the class week (open sets) and the
Sunday digest. If the set cannot be checked when the mark starts (a database
error), the mark still runs, unlinked, and says so. A student's extension
keeps a set open to them past its close (`studentAssignmentStatus`), and a
teacher's confirm or re-mark recomputes the hand-in with the reconcile rules
(`resyncSubmissionsForAttempt`), so the two never disagree.

## Notifications, email and Omni

- In-app notifications go through `lib/teacher/notify.ts`; the bell shows
  them with their own glyphs (`lib/community/notification-icon.ts`). The
  teacher nav's bell and the signed-in app header's bell are `alwaysOn`, so
  class notifications do not depend on the Exam Room flag. The teacher bell's
  "See all" opens `/teacher/notifications`, inside the teacher frame. The
  panel is a disclosure (Escape closes it and returns focus to the bell).
- Students turn set emails off with `email_assignments`, teachers the Sunday
  digest with `email_teacher_digest` — both on `/account/preferences`.
- Omni on teacher pages gets only an address (`teacherOmniContext({ classroomId,
  view })`); `/api/omni-ai` checks ownership and loads the class facts itself.
  Links a teacher is offered — the `render_cta` and any link in the answer's
  prose — must be `/teacher/` pages (`teacherCtaHref`); anything else renders
  as text.

## Tests

`pnpm test:teacher` runs every `lib/teacher/**/*.test.ts`,
`components/teacher/**/*.test.ts` and `lib/student/**/*.test.ts`. The desk-side ones:
`list-classrooms.test.ts` (PATCH validation, delete guard, cursors, plain
text, subjects, roster helpers), `export-csv.test.ts` (quoting, formula
injection, names, both scopes), `seat-grant.test.ts` (parsing, the
decision plan, the desk card) and `start-subjects.test.ts` (every board's
setup form offers subjects save-profile accepts). `lib/site-nav.test.ts`
(in `test:auth`) covers the teacher nav; `lib/omni-ai/teacher-context.test.ts`
(in `test:omni`) the teacher assistant.
