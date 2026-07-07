# Autonomous Course System — Architecture

**Design intent:** Courses should eventually run **autonomously** — built and improved without per-change human approval. Human review is replaced by **automated self-verification** and, later, **marked-outcome ground truth** from the learn ? practice ? mark loop.

**Status:** Architecture only. Phase 1 checks can reuse existing generators; Phase 3 improvement loop is **designed now, activated later** when prerequisites are met.

---

## 1. Principles

| Principle | Meaning |
|-----------|---------|
| **Objective gates, not human gates** | A change ships only if automated checks pass (syllabus coverage, schema, math, links) or, in Phase 3, if marked performance improves on a held-out cohort. |
| **Marking engine = ground truth** | For improvement, the only success signal is delta in **marks earned / criterion bands / weak-topic tags** on practice attempts — never “the model said it looks better.” |
| **Fail closed on ambiguity** | If verification cannot run (missing data, insufficient sample size, flaky A/B), **do not apply** the change. |
| **Bounded autonomy** | Autonomous agents may touch **course content only** (`content/courses/**`, related visuals, course generator prompts). Everything else is denylisted. |
| **On-demand runs, not always-on** | Work happens in explicit **Build Runs** (triggered by cron, CI, or manual `pnpm course:run`). No permanent daemon rewriting lessons in production. |
| **Surface failures only** | Operators see a run summary: pass/fail counts + artifacts for **failed** checks. Silent success requires no attention. |

---

## 2. What exists today (anchors)

Reuse rather than rebuild:

| Asset | Role in autonomous system |
|-------|---------------------------|
| `lib/syllabi/*.json` + `getSyllabusByCode` | Cambridge official topic tree — **coverage denominator** |
| `lib/courses/syllabus-objectives/*.json` | 3-level learning outcomes (9700, 9702, …) — **depth denominator** |
| `lib/courses/generator/generate-lesson.ts` | Lesson authoring with retries |
| `lib/courses/generator/validate-lesson.ts` | Per-lesson checks: paper scope, worked-example traceability, objective coverage score, KaTeX, answerability LLM |
| `content/courses/{code}/{slug}.json` | Published lesson source of truth (git) |
| `attempts` table + `syllabus_tags` | Mark outcomes (performance signal, Phase 3) |
| `lib/ib/assessment-catalog` + `ib_*` tables | IB criteria catalog — **read-only** for verification prompts; **never auto-edited** |
| `/mark?return=/courses/...` | Learn-practice-mark funnel (attribution hook) |

---

## 3. Phase map & activation gates

```
Phase 0 ??? Phase 1 ??? Phase 2 ??? Phase 3
(foundation)  (authoring      (performance    (improvement
               self-checks)    attribution)     loop)
```

### Phase 0 — Foundation (now)

- Syllabus trees and lesson JSON layout stable.
- Generator + `validate-lesson` in CI for pilot subjects.
- Marking engine live for Cambridge + IB practice.

### Phase 1 — Authoring self-checks (**activate when** generator runs exist)

**Goal:** Every lesson/build batch proves syllabus compliance before merge to `content/courses/`.

**Automated checks (objective, no human):**

1. **Coverage completeness (subject level)**  
   For each official syllabus point at configured depth (topic `1.7` Cambridge; IB topic code from guide):  
   - `published` or `premium` JSON exists **or** explicit `outline` waiver with reason.  
   - Fail run if any required point missing.

2. **Depth completeness (lesson level)**  
   For each lesson’s `topicCode`, every child outcome in `syllabus-objectives/{code}.json` (prefix match) must appear in `syllabusObjectivesCovered` **and** pass keyword/embedding presence check (extend `validateObjectiveCoverage`).

3. **Depth targets (quantitative)**  
   Configurable per subject tier, e.g.:
   - ? N worked examples traceable to `sourceQuestionId`
   - ? M flashcards
   - Visual section present when `visual-profile` requires it
   - Minimum word count / section count for `premium` status

4. **Structural integrity**  
   Existing: schema, KaTeX, paper scope, evidence linkage, broken internal links, sitemap path resolvable.

5. **IB-specific (read catalog, don’t write it)**  
   Lesson claims about assessment criteria must **reference** catalog component keys that exist; no invented band descriptors.

**Output:** `course-build-run` artifact with per-subject coverage matrix (green/yellow/red).

### Phase 2 — Performance attribution (**activate when** learn-practice-mark volume sufficient)

**Goal:** Link marked attempts ? lesson/topic so Phase 3 has inputs.

**Prerequisites (hard gate):**

- Courses built for target subjects (Phase 1 green).
- `/mark` traffic with `return=/courses/{code}/{slug}` **or** explicit `topic` + `subject` params.
- Minimum **N attempts per lesson per 14-day window** (start N=30; tune per subject).

**Instrumentation (additive, not in denylist):**

- Extend attempt metadata (nullable columns or JSON sidecar):  
  `lesson_slug`, `topic_code`, `course_subject_code`, `attribution_source` (`course_cta` | `topic_practice` | `organic`).
- Rollup job: `lesson_performance_daily` — per lesson: attempt count, mean `marks_earned/total_marks`, top `weak_topics`, IB criterion miss patterns.

**No autonomous content changes in Phase 2** — aggregation only.

### Phase 3 — Autonomous improvement loop (**activate when** Phase 1 + Phase 2 gates pass)

**Hard prerequisites — loop MUST NOT start until:**

1. **(a) Courses built** — Phase 1 coverage ? configured threshold (e.g. 95% syllabus points have `published` lessons).  
2. **(b) Performance data flowing** — Phase 2 rollups show ? N attempts/lesson/week on ? K lessons per subject.

Without both, the loop has **no syllabus baseline** and **no ground-truth signal** — it would rewrite blind.

**Loop (per weak lesson, on-demand run):**

```
detect weak ??? propose fix ??? shadow publish ??? A/B mark outcomes ??? keep | revert
```

1. **Detect weak**  
   Rank lessons by: low mean mark ratio, rising weak-topic frequency, high “could not identify question” rate on linked practice. Threshold + minimum sample size.

2. **Propose fix**  
   LLM patch constrained to **one lesson JSON** diff: add worked example, clarify section, add flashcard, fix objective gap. Prompt includes: official outcomes, recent weak-topic tags from attempts, **verbatim IB criteria excerpt (read-only)**.

3. **Shadow publish**  
   Write to `content/courses/{code}/{slug}.shadow.json` (never overwrite published without verification).

4. **Verify via marking (ground truth)**  
   - Sample past-paper / practice questions for that topic (from `mark_schemes` / topic tags).  
   - **Synthetic student pipeline is NOT sufficient** — use real anonymized attempt replay where possible, else held-out question bank marked before/after with fixed rubric.  
   - Success: statistically significant improvement in mean marks or reduction in specific weak-topic tag rate on verification set.  
   - Failure or inconclusive: **revert** shadow file, log run.

5. **Promote**  
   Only on pass: move shadow ? published, commit via bot PR, Phase 1 checks re-run.

**Never:** rewrite billing, auth, catalog, SEO routes, or schema as part of this loop.

---

## 4. Hard guardrails (denylist)

Autonomous runs **must refuse** to modify or execute against:

| Category | Paths / systems |
|----------|-----------------|
| Billing & enforcement | `lib/billing/**`, Polar webhooks, quota tables, `reserveMarkUsage`, pricing pages |
| IB marking catalog | `supabase/migrations/*ib*`, `ib_*` tables, `lib/ib/assessment-catalog/**` (read OK, write forbidden) |
| Auth & identity | `lib/supabase*`, middleware auth, RLS policies |
| Base schema | Any migration altering `attempts`, `mark_schemes`, `user_*` without human review |
| SEO / sitemap | `app/sitemap.ts`, `lib/seo/**`, marketing routes (content links *inside* lessons OK) |
| Marking core | `lib/marking/mark-runner.ts`, `single-question-pipeline.ts`, prompt rubrics for official schemes |

**Allowed write surface:**

- `content/courses/**` (`.json`, shadow siblings)
- `public/courses/diagrams/**` (generated assets)
- `lib/courses/generator/**` prompts *only* via human-approved PR template (generator code itself not auto-edited in v1)
- Run logs under `docs/content-generation/` or Supabase `course_build_runs`

Enforce in runner via **path allowlist** + pre-commit hook in bot PRs.

---

## 5. On-demand Build Run architecture

Not a always-on service. A **Run** is a single bounded execution with id, status, and artifacts.

### 5.1 Run types

| Run type | Trigger | Purpose |
|----------|---------|---------|
| `coverage_audit` | Weekly cron / manual | Phase 1 syllabus matrix, no generation |
| `lesson_generate` | Manual / batch script | Generate missing lessons; self-check each |
| `lesson_verify` | Post-PR CI | Re-validate changed JSON only |
| `performance_rollup` | Daily cron | Phase 2 aggregates (read-only) |
| `improvement_cycle` | Manual / weekly (Phase 3+) | Weak-lesson detect ? shadow ? verify |

### 5.2 State machine

```
queued ? running ? { passed | failed | partial }
                      ?
              artifacts uploaded
                      ?
         (improvement only) promoted | reverted
```

Persist runs (minimal schema):

```sql
-- Proposed; apply when implementing Phase 1
create table public.course_build_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  subject_code text,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  config jsonb not null default '{}',
  summary jsonb,           -- pass/fail counts, coverage %
  failure_report jsonb,    -- only failed checks (operator-facing)
  artifact_paths text[],   -- storage paths for matrices, diffs
  created_at timestamptz not null default now()
);
-- Service-role only; no client write
```

### 5.3 Execution environment

**Recommended:** GitHub Actions (or Vercel Workflow DevKit for long Gemini chains) — not production web requests.

```
???????????????????     ????????????????????     ???????????????????????
? Trigger         ??????? course-run CLI   ??????? Validators          ?
? cron / manual / ?     ? pnpm course:run?     ? coverage / lesson / ?
? PR              ?     ? --type ...     ?     ? depth / schema      ?
???????????????????     ????????????????????     ???????????????????????
                                 ?                          ?
                                 ?                          ?
                        ??????????????????         ?????????????????????
                        ? Generator      ?         ? Run record +      ?
                        ? (if generate)  ?         ? failure_report    ?
                        ??????????????????         ?????????????????????
                                                             ?
                                 ?????????????????????????????
                                 ?
                        ??????????????????
                        ? Operator alert ?
                        ? (failures only)?
                        ? Slack / email  ?
                        ??????????????????
```

**CLI sketch:**

```bash
pnpm course:run --type coverage_audit --code 9702
pnpm course:run --type lesson_generate --code 9702 --missing-only
pnpm course:run --type improvement_cycle --code ib-biology --min-attempts 30
```

Exit code non-zero if any **error**-severity check fails; warnings logged but don’t block unless `--strict`.

### 5.4 What surfaces to you

| Outcome | Operator action |
|---------|-----------------|
| All checks pass | None (optional weekly digest) |
| Coverage gap | Report: missing topic codes + suggested generate command |
| Lesson validation fail | JSON path, issue codes, diff link |
| Improvement inconclusive | Shadow discarded automatically |
| Improvement pass | Optional one-line digest; bot PR link |
| Denylist violation attempt | Run aborted, alert immediately |

---

## 6. Verification modules (implement incrementally)

### 6.1 `SyllabusCoverageVerifier`

- Input: `subjectCode`, depth mode (`topic` | `outcome`)
- Source of truth: `getSyllabusByCode` / IB guide topic list (from catalog metadata, read-only)
- Inventory: scan `content/courses/{code}/*.json` statuses
- Output: `{ covered, missing, outline_only, premium_count, coverage_pct }`

### 6.2 `LessonDepthVerifier`

- Extends `validateGeneratedLesson`
- Adds hard thresholds from `lib/courses/generator/quality-targets.ts` (new config file)
- Fails on `severity: 'error'`; coverage score below floor ? error in `--strict`

### 6.3 `LessonPerformanceVerifier` (Phase 3)

- Input: `lesson_slug`, shadow path, verification question set
- Process: run marking pipeline on fixed answers (regression suite) **or** compare pre/post cohort metrics from rollups
- Output: `{ improved: boolean, delta_mean_marks, n, p_value?, revert: boolean }`

### 6.4 `GuardrailEnforcer`

- Pre-flight: diff paths against allowlist
- Runtime: env flag `COURSE_AUTONOMY=1` required for any write to `content/courses`
- Improvement runs additionally require `COURSE_IMPROVEMENT_LOOP=1` + Phase 2 gate check

---

## 7. Sequencing checklist (explicit)

| Step | Deliverable | Autonomy level |
|------|-------------|----------------|
| 1 | `pnpm course:run --type coverage_audit` | Read-only audit |
| 2 | Wire CI: `lesson_verify` on PRs touching `content/courses/**` | Block merge on error |
| 3 | Batch generate missing topics with existing generator + validate | Auto-generate, human merge optional ? later auto-merge on pass |
| 4 | Attempt attribution columns + daily rollup | Read-only analytics |
| 5 | Dashboard: weak lessons by subject (internal) | Read-only |
| 6 | Shadow improvement runner **disabled by default** | `--enable-improvement` flag |
| 7 | Enable improvement per subject when gates met | Full closed loop |

**Do not enable step 6 until steps 1–5 are green for that subject.**

---

## 8. IB vs Cambridge notes

| | Cambridge | IB |
|---|-----------|-----|
| Syllabus source | `lib/syllabi`, `syllabus-objectives` | IB guide topic map + `ib_subject` metadata (read-only) |
| Depth target | B1/M1/A1 worked examples from past papers | Criterion-aligned explanations; band language from catalog (verbatim cite) |
| Performance signal | `marks_earned/total_marks`, `syllabus_tags` | Criterion results, band placement, `weak_topics` |
| Improvement constraint | Don’t alter mark scheme DB | Don’t alter `ib_criterion_band` text; fix **lesson pedagogy** only |

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| LLM rewrites hallucinate syllabus content | Outcome list is checkable; fail if `syllabusObjectivesCovered` ? official set |
| Improvement overfits verification set | Rotate question bank; require real attempt cohort confirmation |
| Low traffic ? noisy metrics | Minimum N gate; no improvement run below threshold |
| Autonomous commit breaks site | `lesson_verify` + `next build` in run; shadow never serves in prod |
| Scope creep into billing/auth | Denylist enforced in runner; separate GitHub token with content-only scope |

---

## 10. Success metrics

**Phase 1:** 100% syllabus point coverage (published or waived) for pilot subjects; zero error-severity validation failures on main.

**Phase 2:** ?80% of course-originated marks carry `lesson_slug` attribution.

**Phase 3:** ?50% of improvement proposals rejected by marking verification (proves gate is strict); accepted proposals show ?5pp mean mark improvement on verification set.

---

## 11. Next implementation slice (recommended)

1. Add `scripts/course-run.mjs` orchestrator + `coverage_audit` verifier (no LLM).  
2. CI job on `content/courses/**` changes calling `validate-lesson` for touched files.  
3. Document quality targets in `lib/courses/generator/quality-targets.ts`.  
4. Defer improvement loop code paths behind `COURSE_IMPROVEMENT_LOOP=0` until Phase 2 data exists.

This delivers **autonomous self-verification for authoring** immediately, while the **performance-grounded improvement loop** remains designed but inert until the learn-practice-mark funnel feeds it.
