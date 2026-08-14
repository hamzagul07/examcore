# Marking Architecture

## Overview

MarkScheme uses a **three-tier mark scheme pipeline**:

1. **Model B** — DB lookup (`mark_schemes` table)
2. **Model A** — Lazy PDF extraction (Gemini reads `qp_` + `ms_` from Storage, caches to DB)
3. **Fallback** — General criteria when no scheme is available

**Adaptive marking** sits on top: the engine detects marking style per
paper/component and routes to the appropriate scorer.

Marking judgment runs on **Gemini Pro**; OCR and scheme extraction run on Gemini
Flash. (This document previously said Claude throughout, which had not been true
for some time.)

## Type detection at mark-time

```
paper_code (e.g. 9702/11)
    → parse subject + component
    → getComponentMarkingType() from lib/marking/component-types.ts
         (overrides from PDF investigation + heuristics)
    → on lazy extraction, Gemini also tags each question with marking_type
    → stored in mark_schemes.marking_type + mark_scheme.type
    → resolveQuestionMarkingStyle() picks the most specific source
```

For **mixed** papers, type is resolved **per question** from extracted `mark_scheme.type` or `question_style`.

`component-types.ts` is a hand-written map, and the cached schemes disagreed with
it on nine components across two subjects, so it is now checked rather than
trusted. Every cached scheme records the shape the real mark scheme had — an
answer key, a marks array, or bands — which makes the papers in the cache
evidence and the map only a claim.

```
pnpm audit:component-types   # fails when the map disagrees with the schemes
```

Pinned in `lib/marking/component-types.evidence.test.ts`. Where the two disagree,
the schemes win.

### When no scheme resolves

Marking style used to fall through to `point_based` whenever no scheme was found,
which is right for "State two reasons" and wrong for "Evaluate the view that…":
the pipeline derived a list of discrete award points and then failed to match
continuous prose against any of them. `looksLikeExtendedResponse()` in
`lib/marking/question-style.ts` now routes an evaluative command term at 6+ marks
to band marking against a scale that is openly labelled `generic_band_scale`, so
a marker can tell it from a published scheme. Maths never bands; an unknown
tariff declines rather than guesses.

Note that `mixed` is not a neutral label on this path. It falls through to
point-based prompting anyway **and** fails the verify gate below, so it buys the
imprecision of both styles and the check of neither. Declare the dominant style
instead.

## Per marking type

| Type | Approach | AI? |
|------|----------|-----|
| **MCQ** | Extract answer key; the model matches student selections to key | Gemini for OCR of selections; scoring is deterministic from the key |
| **Point-based** | Award/withhold each discrete mark (B1/M1/A1/C1) with reasoning | Gemini Pro (9709 uses preserved legacy prompt) |
| **Level-of-response** | Model reads band descriptors, places the response in a band, assigns a mark within it | Gemini Pro with examiner-style LOR prompt |
| **Mixed** | Route each question to MCQ / point / LOR based on extracted structure | Per-question router |

### Math regression (9709)

The **exact** pre-Sprint-28 prompts for 9709 official and general marking live in `lib/marking/prompts.ts` (`build9709OfficialMarkingPrompt`, `build9709GeneralMarkingPrompt`). When `subjectCode === '9709'`, these are used unchanged.

## The verify pass

Point-based and level-of-response marks are marked twice: a first pass, then a
second-opinion re-mark that replaces it. The first-pass score is streamed to the
client as `provisional_score` before verification runs, which is why the wait
shows a "first read" that can still move.

The replacement is unconditional and in either direction, so both marks are
recorded on `mark_runs` (`first_pass_marks`, `final_marks`) — otherwise nothing
would show that the two had ever disagreed. `pnpm marking:health` reports how
often verification moves a mark and which way.

MCQ skips verification: the answer key is deterministic and there is nothing for
a second opinion to add. So does any result that came back without a breakdown —
there would be nothing itemised to re-check.

## Whole-paper vs single-question

**Decision: per-question marking with aggregation** (not single-call-per-paper).

**Why:**
- Essay papers (History, Economics P3/P4) exceed reliable single-call context
- MCQ papers need per-question key lookup anyway
- Failures isolate to one question instead of losing the whole paper
- Token budget: max 15 questions per whole-paper upload

**Flow:**
1. OCR full paper (`WHOLE_PAPER_OCR_PROMPT`)
2. The model segments into `{ paper_code, questions[] }`
3. For each question: Model B → Model A → mark with type-specific prompt
4. Aggregate: total marks, percentage, approximate grade (`lib/marking/grade-thresholds.ts`), per-question breakdown

## Storage paths (confirmed)

Bucket: `paper-pdfs`.

```
cambridge/{code}/{session}/qp_{component}.pdf
cambridge/{code}/{session}/ms_{component}.pdf
```

Session codes: `{s|m|w}{YY}`

## Database

`mark_schemes.marking_type` — `mcq | point_based | level_of_response | mixed`

`mark_runs` carries the marking telemetry: `stage_timings` (elapsed ms per stage,
which is the only thing that can say *which* stage spends the wait),
`first_pass_marks` / `final_marks`, `predicted_marks`, and `client_disconnected`.

## IB guides expire

A guide's cover states when it started and never when it stopped, so
`ib_subject.last_assessment_year` records the end date deliberately. Marking still
runs against a withdrawn rubric — somebody revising a 2024 past paper wants the
rubric that paper was set under — but the result says which guide it used
(`lib/marking/guide-provenance.ts`).

```
pnpm ib:currency   # non-zero when a catalogued guide is already withdrawn
```

Descriptors in `ib_criterion_band` are verbatim and cited. Static profiles in
`lib/ib/marking-config.ts` describe the *shape* of an assessment only — the
profile test fails on any criterion carrying inline bands, because a paraphrased
descriptor marks a student against a standard the IB never wrote.

## Grade estimation

Approximate A*–E thresholds per subject/component in `lib/marking/grade-thresholds.ts`. Labelled as approximate in UI — not official Cambridge boundaries.

## Files

| Module | Role |
|--------|------|
| `lib/marking/component-types.ts` | Component → marking type map |
| `lib/marking/extraction-prompts.ts` | Type-aware Gemini extraction |
| `lib/marking/storage-extract.ts` | Lazy extraction + cache |
| `lib/marking/prompts.ts` | All marking prompts (9709 preserved) |
| `lib/marking/build-marking-prompt.ts` | Prompt router |
| `lib/marking/whole-paper.ts` | Segmentation + aggregation |
| `lib/marking/question-style.ts` | Extended-response routing + generic band scale |
| `lib/marking/guide-provenance.ts` | Which published guide a mark was made against |
| `lib/marking/subject-name.ts` | Subject code → human name, all three boards |
| `app/api/mark/process/route.ts` | HTTP handler; survives client disconnect and emails the result |

## Checking it works

```
pnpm mark:smoke          # routing, denominators, evidence — two real marks
pnpm mark:smoke --full   # + discrimination: does the mark separate good from bad
pnpm marking:health      # latency, retries, verify direction, stage breakdown
```

`mark:smoke` calls the real pipeline, so it costs Gemini and takes minutes. Run it
after touching the marking path. Point-based expectations are exact on purpose:
against a published scheme each mark point is objectively checkable.

## Follow-up

- Run `node scripts/investigate-mark-schemes.mjs` to refresh `investigation-report.json` when new PDFs are synced
- Official grade boundaries could be ingested from Cambridge threshold PDFs if added to storage
- Media Studies (9607) uses non-standard component codes (`21`, `41`) — map verified in cache
