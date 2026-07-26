# Per-paragraph "Explain more" — design spec

Status: implemented (migration not yet applied)
Owner: —
Related: `docs/course-upgrade/`, `lib/omni-ai/`, `components/courses/margin-notes/CourseLessonPage.tsx`

## Problem

Two measured facts about the 1,859 course lessons:

1. **The AI tutor is unreachable from every lesson page.** `OmniFABGate`
   (`components/omni-ai/OmniFABGate.tsx`) renders only when
   `useAuthenticatedAppChrome()` is true → `shouldShowMobileTabBar` →
   `shouldShowAppHeader` → `!isMarketingPath`. `/courses` is in
   `MARKETING_ROUTES` (`lib/site-chrome.ts:96`), so the FAB never mounts.
   `AIContextType` (`lib/omni-ai/types.ts`) has no course-lesson variant either.

2. **"Explain simpler" is all-or-nothing, precomputed, and destructive.** In
   `CourseLessonPage.tsx`: it is a single page-level `simpler` boolean
   (line 99), backed by one fixed rewrite per heading
   (`L.simple.simplerByHeading[n.h]`, line 662). When it is on, the note's
   `bullets` (line 676) and its **exam tip** (line 685) are hidden — the student
   who most needs help loses the exam guidance.

A student stuck on one paragraph has exactly one lever, and pulling it degrades
the rest of the lesson.

## Shape of the fix

A per-note-block control offering **three intents**, because "I don't
understand" is three distinct failures with three distinct remedies:

| Intent | Label | What it produces |
|---|---|---|
| `simpler` | Simpler | Plain English, jargon removed, same claim |
| `why` | Why? | Where it comes from — derivation / causal chain |
| `example` | Show me | One concrete worked instance |

Output streams inline **below the block, without hiding bullets or the tip**.

### Why this is not an Omni-AI chat context

The obvious move is to add a `course_lesson` variant to `AIContextType` and
route through `/api/omni-ai`. That is wrong here:

- Omni meters **per user** (`checkOmniAllowance` / `recordOmniUsage` in
  `app/api/omni-ai/route.ts`). But this output is **deterministic per
  `(lesson, block, intent)`** and identical for every student. Charging each
  user for a rewrite that already exists is both expensive and unfair.
- The total generation space is **bounded and one-time**: ~1,859 lessons ×
  ~6 note blocks × 3 intents ≈ **33k generations, ever**. On Flash that is a
  rounding error. After the cache warms, the feature costs nothing and returns
  in one indexed DB read.

So: a dedicated, cache-first content endpoint — not a chat turn. A cache hit
must consume zero quota and zero model time.

A `course_lesson` Omni context is still worth adding later for open-ended
follow-up questions ("ok but what if the temperature drops?"). That is a
separate, genuinely per-user conversation. Out of scope here.

## Data model

`supabase/migrations/<date>_lesson_explanations.sql`

```sql
create table if not exists public.lesson_explanations (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  lesson_slug text not null,
  -- Stable content hash, NOT the array index: lesson JSON is regenerated and
  -- block order shifts. Index-keyed rows would silently re-attach to the wrong
  -- paragraph after any content regen. See blockKey() below.
  block_key text not null,
  intent text not null check (intent in ('simpler', 'why', 'example')),
  body text not null,
  model text not null,
  -- How many times students asked for this. This column IS the product:
  -- ranked desc it names the paragraphs the catalogue explains worst.
  request_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lesson_explanations_key_idx
  on public.lesson_explanations (lesson_slug, block_key, intent);
create index if not exists lesson_explanations_demand_idx
  on public.lesson_explanations (request_count desc);

alter table public.lesson_explanations enable row level security;

-- Public read: this is shared, non-personal course content.
create policy "read lesson explanations" on public.lesson_explanations
  for select to anon, authenticated using (true);

-- Writes are service-role only, via /api/courses/explain. RLS constrains ROWS,
-- not COLUMNS — without this revoke, the default table-wide grant would let any
-- signed-in user PostgREST arbitrary text into a page we serve to everyone.
revoke insert, update, delete on public.lesson_explanations
  from anon, authenticated;

comment on table public.lesson_explanations is
  'Cached per-paragraph AI explanations for course lessons. Deterministic per (lesson_slug, block_key, intent) and shared across all users. WRITES ARE SERVICE-ROLE ONLY.';
```

No separate event table. `request_count` answers the question we actually have
("which paragraphs confuse students") at a fraction of the write cost.

### `blockKey`

`lib/courses/explain-block-key.ts` — pure, shared by client and server so both
derive the same key without a round trip:

```ts
/** Stable across content regens: keyed on what the student is looking at,
 *  not on where it sits in the array. */
export function blockKey(note: { h: string; p: string }): string
```

Shipped as `lessonBlockKey()`: lowercase + collapse whitespace on `h` and the
first 200 chars of `p`, then two seeded FNV-1a passes, giving 16 hex chars. Sync
and dependency-free rather than SHA-256 via `crypto.subtle`, because the client
needs the key during render and an async boundary there buys nothing at this
keyspace (a handful of blocks per lesson, and the unique index is already scoped
by `lesson_slug`).

Consequence worth knowing: only the first 200 chars of prose are hashed, so an
edit past that point keeps the warm row, but on a paragraph *shorter* than the
sample window any prose edit is a new key and re-generates. Pinned in
`lib/courses/explain-block-key.test.ts` (`pnpm test:catalog`).

## API

`app/api/courses/explain/route.ts` — POST, SSE (matching the `sse()` helper
convention in `app/api/omni-ai/route.ts`).

Request. The client sends **no prose at all**, only a key:

```ts
{
  subjectCode: string
  lessonSlug: string
  blockKey: string
  intent: 'simpler' | 'why' | 'example'
}
```

This is stronger than sending the paragraph and validating it server-side. The
text to explain is *resolved* from the on-disk lesson, so there is no code path
in which caller-supplied prose can become the body of a row we serve publicly.
That is an absence of the capability rather than a check that could be got wrong.

Flow:

1. `select body from lesson_explanations where (lesson_slug, block_key, intent)`.
   **Hit**: bump `request_count` via the `bump_lesson_explanation_demand` RPC,
   emit `{type:'done', body, cached:true}`, return. No model call, no
   rate-limit consumption, no lesson load off disk.
2. **Miss**: `getCourseLesson()`, run `extractNotes()` over its sections, and
   find the note whose `lessonBlockKey()` matches. No match (stale client after
   a content regen, or a fabricated key) gives a 404. We have no paragraph to
   explain and will not invent one.
3. IP rate-limit, misses only (~20/hr), reusing the in-memory hourly bucket
   pattern from `app/api/omni-ai/route.ts`. Cache hits never reach this.
4. Stream from Gemini, accumulate, upsert **only on a cleanly closed stream**.
   A truncated body would otherwise be served to every future reader of that
   paragraph.

If the table is missing or the cache write fails, the student still gets their
explanation and the route logs the failure: the feature degrades to
always-generate rather than breaking. Verified, since that is exactly how it
behaved before the migration was applied.

### Model

Add to `GeminiTask` in `lib/ai/gemini-models.ts`:

```ts
| 'explain-block'   // per-paragraph course explanation
```

Leave it out of `PRO_TASKS` → resolves to `GEMINI_FLASH_MODEL`. Rationale: the
output is a short, tightly-grounded rewrite of text we supply, and a student is
sitting there mid-read waiting for it. Latency matters more than depth; Pro
buys nothing here and costs several seconds.

**Thinking budget — a real trap.** Gemini 2.5 draws thinking tokens from the
same allowance as `maxOutputTokens`, and nothing in this codebase had ever set
`thinkingConfig`, so every Flash call runs with the default dynamic budget. The
first working version of this route capped output at 700 tokens and returned
answers truncated mid-word: thinking had eaten the budget before the model
wrote anything. `GeminiTextOptions` now takes an optional `thinkingBudget`
(omitted everywhere else, so no existing call site changes behaviour) and this
route passes `0` with `maxOutputTokens: 1200`. Worth remembering for any other
short-output Flash task added later.

### Prompt grounding

The single biggest risk is a plausible explanation that drifts off-syllabus —
worse than no feature at all for an exam product. Ground it with:

- **Board and its vocabulary.** Reuse the rule already established in
  `buildSystemPrompt` (`lib/omni-ai/system-prompts.ts`): Cambridge uses
  B1/M1/A1 and grades A*–E; IB uses markbands/criteria and grades 1–7. Derive
  the board from `subjectCode` (numeric → Cambridge, `ib-*` → IB).
- **Syllabus scope.** `getSubtopicsForLesson()`
  (`lib/courses/syllabus-outcomes.ts:18`) for the objectives this lesson covers.
- **The block itself** — heading, prose, bullets, exam tip.
- **Lesson title + `topicCode`.**

Constraints in the system prompt:

- Explain only what is in the supplied paragraph. Do not introduce content
  beyond the listed syllabus objectives.
- ≤ 120 words for `simpler` and `why`; ≤ 150 for `example`.
- Reuse the LaTeX rule verbatim from `buildSystemPrompt` — every expression in
  `$...$`, never backticks, never bare parentheses. The lesson renderer is
  KaTeX-backed (`CourseRichText`), so unwrapped math renders as literal junk.
- No `[[ACTION:...]]` directives — this is not chat and nothing parses them.

## UI

`components/courses/margin-notes/CourseLessonPage.tsx`, inside the
`L.notes.map` block (~line 658).

- New client component `components/courses/ExplainBlock.tsx`: a row of three
  ghost buttons under each `.note-block`, plus an inline expansion region.
- Streams into a `CourseRichText variant="prose"` so math and markdown match the
  surrounding lesson exactly.
- Expansion is visually inset (left rule + tinted surface) so it reads as a
  clarification of that paragraph, not as new lesson content.
- Idle by default — buttons are `micro`-scale and low-contrast until hover, so
  six of them down a lesson don't shout.
- Collapsible, and **additive**: bullets and the exam tip stay put.
- One in-flight request per block; disable that block's buttons while streaming.

### Ship alongside: stop `simpler` deleting content

Independent of the AI work, remove the `&& !simpler` guards at
`CourseLessonPage.tsx:676` (bullets) and `:685` (exam tip). Hiding the exam tip
from the student who just asked for help is backwards, and once per-block
explain exists there is no reason for the global toggle to be destructive.

## Phase 2 (not in this spec)

- **Server-prefetch warm rows.** Lesson pages are statically generated with
  ISR; selecting the already-cached explanations for a lesson at render time and
  passing them down makes the common case instant with no network at all. One
  extra DB read per revalidation.
- **Confusion ranking.** `order by request_count desc` → the ranked list of
  paragraphs the catalogue explains worst. This is the real prize: it tells us
  which lessons to rewrite and which diagrams to draw next, replacing
  "wherever a diagram family happened to map" with actual demand.
- **Feed into spaced review.** A block a student needed help on should resurface
  in `/dashboard/review`, alongside the existing marked-attempt signal.
- **`course_lesson` Omni context** for open-ended follow-ups.

## The two-route subject-code trap

IB lessons are served on two routes that pass **different** `subjectCode` values:

| Route | `subjectCode` | Indexed? |
|---|---|---|
| `/ib/courses/<slug>/<lesson>` | `history-hl` (catalog slug) | **yes** — 871 sitemap URLs |
| `/courses/ib-<subject>/<lesson>` | `ib-history-hl` (content dir) | no; nothing links to it |

`getIbCourseSlugs()` builds the canonical slug with `d.slice(3)`, stripping the
prefix. Content only ever lives under the prefixed name.

The first version of this route called `getCourseLesson(subjectCode, …)`
directly, so it worked only on the **unindexed alias** — which is where it was
originally tested. On every indexed IB lesson page it returned
`404 Unknown lesson`. Worse, `isIbCourseCode()` tests for the `ib-` prefix, so an
unprefixed code would have been classified as Cambridge and the model prompted
for B1/M1/A1 marks on a markband subject.

`resolveLesson()` now tries the code as given, then prefixed, and returns the
canonical content code so the prompt, board detection and cached `subject_code`
all agree regardless of caller. Pinned by
`lib/courses/ib-subject-code.test.ts` (`pnpm test:catalog`).

**Lesson for future work here: verify on `/ib/courses/<slug>`, not
`/courses/ib-<subject>`.** The latter is a legacy alias and is not what users or
crawlers see.

## Verification sweep

After the two-route fix, 22 lesson pages were swept in a real browser — 18 IB
subjects on the canonical `/ib/courses/<slug>` route plus 4 Cambridge subjects —
checking render, note-block count, `explain-btn` count (must equal notes x 3),
diagram presence, and the sticky sync region.

**22/22 clean.** Explain buttons present at the right count on every page; sync
region active on every page; diagrams present wherever one is mapped.

Two harness traps worth remembering if you re-run it:

- **Fixed sleeps under-report.** Pages hydrate at very different speeds after
  the guest signup gate is dismissed. A 1.3s wait showed 8 "failures" that were
  all fine — one page had 0 note blocks at 1.3s and 5 at 5s. Poll with
  `waitForFunction(() => document.querySelectorAll('.note-block').length > 0)`.
- **Explorables do not use `svg.lesson-diagram-svg`.** The 18 bespoke explorables
  (`components/courses/explorables/`) render their own markup — `qex-*`,
  `.diagram-wrap`. Selecting only on the shared class reports a false
  MISSING-DIAGRAM on those lessons.

## UI polish pass

- **Close control + Escape.** The panel is an inline expansion opened mid-read;
  it now has an explicit `×` and Escape closes the panel the reader is in
  (hover or focus scoped, so multiple open panels do not all close at once).
- **Shimmer instead of a "Thinking…" line.** The placeholder now reserves roughly
  the height the answer will occupy, so the paragraph below does not jump when
  the first token arrives. Respects `prefers-reduced-motion`.
- **Mobile (≤480px).** The "Not clear?" label takes its own line so the three
  pills stay at a tappable width instead of being squeezed. Actions are always
  full-opacity on small screens — there is no hover to reveal them. Measured at
  390px: 52px row, no horizontal scroll.

## Deployment notes

- **The migration is not applied.** `supabase/migrations/20260726_lesson_explanations.sql`
  needs running against the project before the cache does anything. Until then
  the route works but regenerates on every request (verified).
- **Function size.** The route calls `getCourseLesson()`, which reads
  `content/courses` off disk via `path.join(process.cwd(), ...)`. nft recognises
  that pattern and traces the whole directory, so this adds ~39 MB to one more
  serverless function. Well inside the 250 MB limit, but this project has hit
  that ceiling before — worth a glance at the `.nft.json` after the first deploy.
- **Not verified in a real browser.** Typecheck, lint, the block-key unit tests
  and the live API (all three intents, both boards) pass, and the component
  compiles into the client chunk. But the lesson page is client-gated behind
  `useAuthCheck`/`useBillingAccess`, so SSR only yields the skeleton and the
  Chrome extension was not connected for a visual pass. The rendered layout of
  the buttons and the expansion panel is unconfirmed.

## Cost

Bounded, one-time, amortising. Ceiling ≈ 33k Flash generations across the whole
catalogue; steady state is indexed DB reads. There is no per-user quota because
there is no per-user cost.
