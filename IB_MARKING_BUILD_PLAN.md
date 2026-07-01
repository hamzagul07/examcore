# IB Marking Engine — Phase 2 Build Plan

**Status:** DESIGN ONLY. No marking logic changed, no DDL run, no migration file created in this
pass. This document is the reviewable build plan: the proposed catalog migration (SQL for you to
apply), the document-ingestion workflow, the sequenced code-change map, and the Math AA
definition-of-done. Companion to `IB_MARKING_DESIGN.md` (approved).

## Confirmed decisions carried in

1. **Subjects (all current cycles):** Math AA (2021), Physics (2025), Biology (2025),
   History (2017), Economics (2022), Psychology, Language B (2020 — Spanish B *or* French B, TBN),
   plus Core **TOK** (2022) and **EE** (2018). No legacy-cycle branching.
2. **Verbatim storage + two-field text model.** IBO descriptor text stored **verbatim** in
   `ib_criterion_band.descriptor` (authoritative, student-facing, cited via `source_document_id`).
   A separate **optional `marking_guidance`** field carries an operational rendering the engine
   marks against. **Verbatim is always source-of-truth and what's shown/cited; `marking_guidance`
   (where present) is what's assembled into the marking prompt.** `marking_guidance` ships **null**
   and is authored later, per component.
3. **Points-first build order.** Math AA → Sciences proven end-to-end before any criteria subject;
   EE/TOK holistic **last**. The **schema holds all components now**; only the *wiring* is sequenced.

---

## Part A — Migration plan (proposed SQL — you review & apply; Supabase stays read-only)

**Proposed file:** `supabase/migrations/20260701_ib_assessment_catalog.sql` (I have **not** created
it — the SQL below is for your review; apply it yourself). Matches repo conventions observed in
`20260606_extraction_pipeline.sql` and the service-only RLS pattern in
`20260602_service_rls_lockdown.sql`.

### A.1 Impact statement (zero-touch guarantee)

- **Only `CREATE TABLE` on six new `ib_*` tables** + their indexes, comments, and service-only RLS.
- **No `ALTER`/`DROP`** on `mark_schemes`, `attempts`, or any billing table
  (`pricing_config`, `rate_limits`, `stripe_webhook_events`, `shadow_enforcement_log`, quota tables).
- **No changes** to `lib/billing/*`, enforcement/usage paths, or result-recording.
- All new tables are **service-role only** (licensed content; service role bypasses RLS, client
  roles denied) — same posture as `mark_schemes`.
- Purely **additive**: nothing reads these tables until the M1 wiring lands, so applying the
  migration alone changes no runtime behavior.

### A.2 Subject-code reconciliation (note before you read the SQL)

Existing IB marking profiles bake level into the code (`ib-biology-hl` / `ib-biology-sl`). The
approved §3.2 model makes **level a component property**, so catalog `ib_subject.code` is
**level-agnostic** (`ib-biology`, `ib-maths-aa`, `ib-history`, `ib-tok`, `ib-extended-essay`). The
resolver maps an existing `ib-<subject>-<hl|sl>` selection → catalog `(subject_code, level)`. The
legacy `IB_MARKING_PROFILES` map stays **untouched** and acts as fallback for out-of-scope subjects.

### A.3 Proposed SQL

```sql
-- IB assessment catalog — additive. Does NOT touch mark_schemes / attempts / billing.
-- Holds all components for every in-scope subject now; wiring is sequenced separately.

-- ---------------------------------------------------------------------------
-- ib_source_document — provenance / licensing anchor for every verbatim row
-- ---------------------------------------------------------------------------
create table public.ib_source_document (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text not null,               -- subject_guide | markscheme | assessment_instrument | ee_guide | tok_guide
  subject_code text,                    -- null for cross-subject (generic TOK/EE)
  cycle_version text not null,          -- e.g. '2021', '2025'
  first_assessment_year int,
  storage_path text,                    -- private Supabase storage path to the licensed PDF
  notes text,
  supplied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ib_subject — level-agnostic subject (level lives on ib_component)
-- ---------------------------------------------------------------------------
create table public.ib_subject (
  code text primary key,                -- 'ib-maths-aa', 'ib-biology', 'ib-tok', 'ib-extended-essay'
  name text not null,
  subject_group text not null,          -- 'Mathematics' | 'Sciences' | 'Individuals and Societies' | 'Core' | ...
  level_scope text not null,            -- 'HL_SL' | 'HL_only' | 'SL_only' | 'Core'
  guide_version text not null,          -- e.g. '2021'
  first_assessment_year int,
  source_document_id uuid references public.ib_source_document (id),
  created_at timestamptz not null default now(),
  constraint ib_subject_level_scope_chk
    check (level_scope in ('HL_SL','HL_only','SL_only','Core'))
);

-- ---------------------------------------------------------------------------
-- ib_component — the first-class per-component unit; carries assessment_model
-- ---------------------------------------------------------------------------
create table public.ib_component (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null references public.ib_subject (code) on delete cascade,
  component_key text not null,          -- paper_1 | paper_2 | paper_3 | ia | ee | tok_essay | tok_exhibition | io
  label text not null,                  -- student-facing, e.g. 'Paper 3 (HL)'
  level text not null,                  -- 'HL' | 'SL' | 'both'
  assessment_model text not null,       -- 'points' | 'criteria'
  response_format text,                 -- mcq | structured_points | markband | holistic (nullable / derived)
  max_marks int,
  source_document_id uuid references public.ib_source_document (id),
  created_at timestamptz not null default now(),
  constraint ib_component_model_chk
    check (assessment_model in ('points','criteria')),
  constraint ib_component_level_chk
    check (level in ('HL','SL','both')),
  constraint ib_component_identity_unique
    unique (subject_code, component_key, level)
);

create index ib_component_subject_level_idx
  on public.ib_component (subject_code, level);

-- ---------------------------------------------------------------------------
-- ib_criterion — criteria-model components only; verbatim name + optional guidance
-- ---------------------------------------------------------------------------
create table public.ib_criterion (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.ib_component (id) on delete cascade,
  letter text not null,                 -- 'A'..'E', 'LO1'..'LO7'
  name text not null,                   -- VERBATIM official criterion name
  max_marks int not null,
  ordinal int not null,
  marking_guidance text,                -- OPTIONAL operational note; null by default (verbatim wins)
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now(),
  constraint ib_criterion_identity_unique unique (component_id, letter)
);

create index ib_criterion_component_idx on public.ib_criterion (component_id);

-- ---------------------------------------------------------------------------
-- ib_criterion_band — VERBATIM descriptor (authoritative) + optional marking_guidance
-- ---------------------------------------------------------------------------
create table public.ib_criterion_band (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references public.ib_criterion (id) on delete cascade,
  marks_min int not null,
  marks_max int not null,
  descriptor text not null,             -- VERBATIM official band descriptor (student-facing, cited)
  marking_guidance text,                -- OPTIONAL operational rendering fed to the prompt; null by default
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now(),
  constraint ib_criterion_band_range_chk check (marks_min <= marks_max),
  constraint ib_criterion_band_identity_unique unique (criterion_id, marks_min, marks_max)
);

create index ib_criterion_band_criterion_idx on public.ib_criterion_band (criterion_id);

-- ---------------------------------------------------------------------------
-- ib_points_scheme — points-model components; verbatim structured scheme + optional guidance
-- ---------------------------------------------------------------------------
create table public.ib_points_scheme (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.ib_component (id) on delete cascade,
  paper_ref text,                       -- series/paper identifier, or null for generic conventions
  marks jsonb not null,                 -- VERBATIM structured mark points (mirrors existing point_based shape)
  accept_alternatives jsonb,            -- 'accept' equivalents / alternative valid forms
  ecf_rules jsonb,                      -- error-carried-forward linkage between parts
  marking_guidance jsonb,               -- OPTIONAL operational rendering; null by default
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now()
);

create index ib_points_scheme_component_idx on public.ib_points_scheme (component_id);

-- ---------------------------------------------------------------------------
-- Comments (semantics of the two-field text model)
-- ---------------------------------------------------------------------------
comment on table  public.ib_source_document is
  'Licensed IB documents supplied by the operator. Provenance anchor for every verbatim row.';
comment on column public.ib_criterion_band.descriptor is
  'VERBATIM official IBO band descriptor. Authoritative, student-facing, always cited. Source of truth.';
comment on column public.ib_criterion_band.marking_guidance is
  'OPTIONAL operational rendering assembled into the marking prompt. Null until authored. Verbatim descriptor always wins as source of truth.';
comment on column public.ib_criterion.marking_guidance is
  'OPTIONAL criterion-level operational note for the marking prompt. Null by default.';
comment on column public.ib_points_scheme.marking_guidance is
  'OPTIONAL operational rendering of the points scheme for the marking prompt. Null by default; verbatim marks jsonb is source of truth.';
comment on column public.ib_component.assessment_model is
  'points | criteria — the first-class routing axis. Confirmed against the official guide at ingestion; guide wins over phase-1 inference.';

-- ---------------------------------------------------------------------------
-- RLS: service-role only (licensed content). Client roles denied; service bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.ib_source_document enable row level security;
alter table public.ib_subject         enable row level security;
alter table public.ib_component        enable row level security;
alter table public.ib_criterion        enable row level security;
alter table public.ib_criterion_band   enable row level security;
alter table public.ib_points_scheme    enable row level security;

create policy ib_source_document_service_only on public.ib_source_document
  for all to authenticated, anon using (false) with check (false);
create policy ib_subject_service_only on public.ib_subject
  for all to authenticated, anon using (false) with check (false);
create policy ib_component_service_only on public.ib_component
  for all to authenticated, anon using (false) with check (false);
create policy ib_criterion_service_only on public.ib_criterion
  for all to authenticated, anon using (false) with check (false);
create policy ib_criterion_band_service_only on public.ib_criterion_band
  for all to authenticated, anon using (false) with check (false);
create policy ib_points_scheme_service_only on public.ib_points_scheme
  for all to authenticated, anon using (false) with check (false);
```

> Note: the subject-group column is named `subject_group` (not `group`) to avoid the SQL reserved word.

---

## Part B — Document-ingestion workflow (repeatable, provenance-first)

When you supply an official guide/markscheme, this is the process to turn it into catalog rows.
It is a **transcription + validation** process, not a marking process.

### B.1 Steps per document

1. **Register the document.** Insert one `ib_source_document` row (title, `doc_type`,
   `cycle_version`, `first_assessment_year`, `storage_path` to the licensed PDF in private storage).
   Everything transcribed from it references this `id`.
2. **Enumerate components from the guide's assessment outline.** For each externally/internally
   assessed component, create/confirm an `ib_component` row: `component_key`, `label`, `level`
   (HL/SL/both), `max_marks`.
3. **Classify `assessment_model` from the guide — GUIDE WINS.** Read how the component is actually
   assessed. If it's a markscheme with mark points → `points`; if it's markbands/criteria → `criteria`.
   **Where the guide contradicts the inferred classification in the phase-1 design doc, the guide
   is authoritative:** update `ib_component.assessment_model`, and record the correction in the
   ingestion log (below) so the phase-1 inference is visibly superseded.
4. **Transcribe content verbatim:**
   - *Criteria components* → one `ib_criterion` per criterion (verbatim `name`, `max_marks`,
     `ordinal`), and one `ib_criterion_band` per band (verbatim `descriptor`, `marks_min`/`marks_max`),
     each with `source_document_id` + `source_pages`. **`marking_guidance` left null.**
   - *Points components* → `ib_points_scheme` rows: the verbatim structured `marks` (mirroring the
     existing `point_based` shape — M/A/B point ids, values, descriptions), plus `accept_alternatives`
     and `ecf_rules` where the markscheme states them.
5. **Validate structurally** (automated checks, see B.2). Fix transcription until clean.
6. **Record an ingestion log entry** (a short markdown note per document under `docs/ib-ingestion/`):
   components found, `assessment_model` per component, **any phase-1 corrections (guide-wins)**,
   page citations, and open questions. This is the human-reviewable audit trail before the rows go live.

### B.2 Validation checks (must pass before rows are considered ingested)

- **Mark conservation:** for criteria components, `Σ ib_criterion.max_marks == ib_component.max_marks`.
- **Band coverage:** each criterion's bands are contiguous and non-overlapping from `0..max_marks`
  (no gaps, no double-cover); top band's `marks_max == criterion.max_marks`.
- **Verbatim integrity:** `descriptor`/`name` non-empty; no paraphrase in verbatim fields; every
  verbatim row has a `source_document_id` and `source_pages`.
- **Model sanity:** `assessment_model = 'criteria'` ⇒ has ≥1 `ib_criterion`; `'points'` ⇒ has ≥1
  `ib_points_scheme`. No component has both.
- **Level integrity:** HL-only components (e.g. Paper 3) exist only where `level_scope` permits.

### B.3 Output of ingestion

Per document: the DB rows (for you to apply) **plus** a `docs/ib-ingestion/<doc>.md` record with the
component map, the assessment-model decisions, and the guide-wins corrections. You approve the record
before the SQL insert is applied.

---

## Part C — Code-change map (described, not written; sequenced by milestone)

Each item lists the file and the change. **No diffs here** — this is the approval surface.
Milestones are ordered so **points (Math AA) proves end-to-end before anything criteria touches
the renderer.**

### M0 — Schema + ingestion tooling (no runtime behavior change)
- **`supabase/migrations/20260701_ib_assessment_catalog.sql`** — you apply Part A.
- **`lib/ib/assessment-catalog.ts`** *(new)* — read-only DB accessors (service client):
  `getSubject`, `listComponents(subjectCode, level)`, `getComponent(subjectCode, level, componentKey)`,
  `getCriteria(componentId)` (+ bands), `getPointsScheme(componentId)`, and
  `assembleMarkingRubric(component)` which returns, per criterion/band, `marking_guidance ?? descriptor`
  (verbatim as fallback) for prompt assembly — while keeping the verbatim `descriptor` available for
  student-facing citation. Nothing calls this yet.
- **`docs/ib-ingestion/`** *(new dir)* — ingestion logs (Part B.3).

### M1 — POINTS path end-to-end (Math AA) — the milestone that must be proven
- **`app/api/mark/process/route.ts`** — parse two new optional form fields `ib_component_key` and
  `ib_level` from `formData`; pass them into `pipelineInput`. **No change to billing/enforcement/
  reservation or the `attempts` insert.**
- **`lib/marking/single-question-pipeline.ts`** — extend `SingleQuestionMarkInput` with
  `ibComponentKey?` + `ibLevel?`; when present (IB practice), resolve the catalog component via
  `assessment-catalog.ts`; pass the resolved component + points scheme into `markSingleQuestion`;
  include component/level in the `emitContext` payload.
- **`lib/marking/mark-runner.ts`** — `markSingleQuestion` accepts an optional resolved
  `ibComponent` + scheme; when present, routes by `assessment_model` and passes the catalog points
  scheme to the prompt builder instead of the synthetic `buildIbPracticeMarkScheme`. (Synthetic
  path remains the fallback for unresolved subjects.)
- **`lib/marking/build-marking-prompt.ts`** — add a catalog-aware branch at the top of the IB
  section: if a resolved catalog component is supplied, dispatch on `assessment_model`
  (`points` → mcq/point-based builder fed by `ib_points_scheme`; `criteria` → criterion builder in
  M3). Existing `mark_scheme.assessment === 'criterion'` / `isIbSubjectCode` logic stays as fallback.
- **`lib/marking/types.ts`** — add `IbComponentKey`, `IbLevel` unions; thread `component_key` +
  `level` + `assessment_model` onto the marking context/result types.
- **Selection flow — `app/mark/page.tsx`** — add a **Level (HL/SL)** control and a **Component**
  `<select>` for IB, both **derived from `listComponents()`** (so we never offer a component we
  can't mark); set `ib_level` + `ib_component_key` on the upload `FormData`. Past-paper/whole-paper
  tabs may be re-enabled for `points` components in a later step.
- **`components/mark/MarkBoardPicker.tsx`** — unchanged (board choice already exists).
- **`lib/profile-options.ts` / `lib/ib/marking-config.ts`** — add a thin adapter mapping the
  existing `ib-<subject>-<hl|sl>` selections to catalog `(subject_code, level)`. Legacy structures
  untouched.

*Points path renders through the existing `marks_awarded[]` → ExamSheet UI with no renderer changes,
so M1 needs no presentation work.*

### M2 — Presentation de-gating + criterion carry-through (prerequisite for criteria subjects)
- **`components/MarkingResultView.tsx`** — branch the top-level render on `assessment_model`
  (or on presence of `criteria_results` / `band_result`) **independent of `marks.length`**, so a
  markband/criteria result mounts the band meter + `MarkAuditPanel` without a points array
  (fixes G5). Keep verbatim descriptor visible + cited alongside any `marking_guidance`-derived text.
- **`components/mark/MarkAuditPanel.tsx`** — make the criteria breakdown reachable for
  criteria-only results; render the currently-ignored `strengths` / `improvements` per criterion.
- **`lib/marking/normalize-math.ts`** — `coerceMarkingResult`: add `criteria_results` as an unwrap
  trigger and default it to `[]`; `isUsableMarkingResult`: accept a non-empty `criteria_results`;
  `normalizeMarkingResult`: math-normalize each `criteria_results[].justification` /
  `.band_descriptor` (fixes G6).
- **`lib/marking/whole-paper.ts`** — `toMarkingAIResult` carries `criteria_results` through (today
  it drops it).

### M3 — Criteria subjects (History → Economics → Psychology → Language B)
- **`lib/marking/prompts.ts`** — parameterize `buildIbCriterionMarkingPrompt` (and LOR builder) to
  assemble from catalog criteria/bands using `marking_guidance ?? descriptor`; **no IBO wording
  hardcoded** — text comes from catalog rows. Per-component paradigm splits (e.g. History Paper 1
  source points vs Paper 2 essays) resolve via each component's `assessment_model`.
- **Renderer** already de-gated in M2.

### M4 — Core holistic (TOK essay/exhibition, EE) — LAST
- Represent holistic instruments as `criteria` with a **single** criterion (the global instrument),
  reusing the M2/M3 criteria contract. EE additionally selects the **host subject** to attach
  subject-specific criteria.

### Change-surface summary
| Milestone | Files touched | Behavior change |
|-----------|---------------|-----------------|
| M0 | migration, `assessment-catalog.ts`, ingestion docs | none (additive) |
| M1 | `route.ts`, `single-question-pipeline.ts`, `mark-runner.ts`, `build-marking-prompt.ts`, `types.ts`, `mark/page.tsx`, profile adapters | IB points marking via catalog |
| M2 | `MarkingResultView.tsx`, `MarkAuditPanel.tsx`, `normalize-math.ts`, `whole-paper.ts` | criteria/markband results render + persist |
| M3 | `prompts.ts` (+ renderer already ready) | criteria subjects mark |
| M4 | `prompts.ts`, selection for EE host subject | TOK/EE holistic |

---

## Part D — Definition of Done: POINTS-FIRST milestone (Math AA)

"Math AA marks accurately end-to-end" means **all** of the following, validated **before** Sciences:

### D.1 Catalog & ingestion
- `ib_subject` has `ib-maths-aa` (`level_scope = 'HL_SL'`); `ib_component` holds SL {Paper 1,
  Paper 2, IA-Exploration} and HL {Paper 1, Paper 2, Paper 3, IA-Exploration}, each with correct
  `assessment_model` (papers = `points`; Exploration = `criteria`, schema-present but not yet
  wired for marking in this milestone).
- Math AA points conventions ingested into `ib_points_scheme` (M/A/B point semantics, ECF linkage,
  "accept" alternative forms, AG constraints) from an **official Math AA markscheme**, with
  provenance rows + an ingestion log.

### D.2 Selection & routing
- Student can select IB → Math AA → HL/SL → Paper (1/2/3) and upload; the payload carries
  `ib_level` + `ib_component_key`; the pipeline resolves the correct catalog component and routes to
  the points builder. Selecting an HL-only Paper 3 is impossible under SL.

### D.3 Marking accuracy (validated against official markschemes)
- A **calibration set** of official Math AA past-paper questions (HL & SL, spanning P1/P2/P3) with
  known official mark outcomes is marked by the engine. **The pass/ship threshold is UNSET and is
  the operator's decision** — I do not pick a pass rate. My job is to assemble the set and **report**,
  per run:
  - **Exact total-mark agreement %** with the official markscheme, **±1-mark agreement %**, and
    **every miss itemized** (question, engine marks, official marks, why it diverged).
  - **Correct ECF behavior** on multi-part questions: a wrong early value carried into a later part
    earns method/subsequent marks per the markscheme (the behavior demonstrated in our earlier
    truncation test).
  - **Correct "accept" handling:** equivalent valid forms/alternative methods are credited.
  - **No full-marks inflation** on flawed answers and **no under-crediting** on correct ones
    (checked on paired correct/flawed variants).
- A repeatable **calibration harness** (a `tsx` runner in the pattern already used in this repo,
  reading the calibration set + official outcomes, printing per-question agreement) so re-runs are
  cheap and regression-checked.

### D.4 No regressions / guardrails intact
- Cambridge marking output is **unchanged** on a fixed sample (byte-for-byte routing untouched for
  non-IB).
- Billing/enforcement, quota, and `attempts` recording behave identically (no code touched there).
- `tsc --noEmit` clean; existing `npm run test:ib` / `test:extraction` suites pass.

Only when D.1–D.4 are green do we proceed to Sciences (Physics/Biology), then M2 → criteria subjects.

---

## Part E — Phase-0 guardrails (restated, in force for all milestones)

Untouched, no exceptions:
- `lib/billing/*` and all enforcement/usage/quota paths (`reserveMarkUsage`,
  `finalizeMarkReservation`, rate-limit, `20260629_atomic_mark_quota`).
- Result-recording: the `attempts` insert and its columns.
- `mark_schemes` / `attempts` base schema (catalog is a **separate** additive set of tables).
- SEO JSON-LD / sitemap and the chunked-article structure.
- This is the **criteria/marking engine only.**

---

## Approval gate

Please:
1. **Approve this build plan** (Part A SQL, Part B ingestion workflow, Part C sequenced code-change
   map, Part D Math AA DoD) — or flag changes (incl. the `"group"` column-name preference).
2. **Supply Tier 1 document #3 — the Mathematics AA guide (first assessment 2021)** — to start
   points-first ingestion. If you have an **official Math AA markscheme** (any recent series, HL+SL),
   include it too so I can seed `ib_points_scheme` and stand up the calibration set for the DoD.

*No marking logic was changed in this pass.*
