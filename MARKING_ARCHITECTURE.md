# Marking Architecture (Sprint 28)

## Overview

ExamCore uses a **three-tier mark scheme pipeline** unchanged from Sprint 27:

1. **Model B** — DB lookup (`mark_schemes` table)
2. **Model A** — Lazy PDF extraction (Gemini reads `qp_` + `ms_` from Storage, caches to DB)
3. **Fallback** — General criteria when no scheme is available

Sprint 28 adds **adaptive marking** on top: the engine detects marking style per paper/component and routes to the appropriate scorer.

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

## Per marking type

| Type | Approach | AI? |
|------|----------|-----|
| **MCQ** | Extract answer key; Claude matches student selections to key | Claude for OCR parsing of selections; scoring is deterministic from key |
| **Point-based** | Award/withhold each discrete mark (B1/M1/A1/C1) with reasoning | Claude (9709 uses preserved legacy prompt) |
| **Level-of-response** | Claude reads band descriptors, places response in a band, assigns mark within band | Claude with examiner-style LOR prompt |
| **Mixed** | Route each question to MCQ / point / LOR based on extracted structure | Per-question router |

### Math regression (9709)

The **exact** pre-Sprint-28 Claude prompts for 9709 official and general marking live in `lib/marking/prompts.ts` (`build9709OfficialMarkingPrompt`, `build9709GeneralMarkingPrompt`). When `subjectCode === '9709'`, these are used unchanged.

## Whole-paper vs single-question

**Decision: per-question marking with aggregation** (not single-call-per-paper).

**Why:**
- Essay papers (History, Economics P3/P4) exceed reliable single-call context
- MCQ papers need per-question key lookup anyway
- Failures isolate to one question instead of losing the whole paper
- Token budget: max 15 questions per whole-paper upload

**Flow:**
1. OCR full paper (`WHOLE_PAPER_OCR_PROMPT`)
2. Claude segments into `{ paper_code, questions[] }`
3. For each question: Model B → Model A → mark with type-specific prompt
4. Aggregate: total marks, percentage, approximate grade (`lib/marking/grade-thresholds.ts`), per-question breakdown

## Storage paths (confirmed)

```
cambridge/{code}/{session}/qp_{component}.pdf
cambridge/{code}/{session}/ms_{component}.pdf
```

Session codes: `{s|m|w}{YY}`

## Database

`mark_schemes.marking_type` — `mcq | point_based | level_of_response | mixed`

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
| `app/api/mark/process/route.ts` | HTTP handler |

## Follow-up

- Run `node scripts/investigate-mark-schemes.mjs` to refresh `investigation-report.json` when new PDFs are synced
- Official grade boundaries could be ingested from Cambridge threshold PDFs if added to storage
- Media Studies (9607) uses non-standard component codes (`21`, `41`) — map verified in cache
