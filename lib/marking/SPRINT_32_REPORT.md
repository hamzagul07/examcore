# Sprint 32: Cold-path marking speed

## Summary

Cold-path single-question marking is faster via targeted Gemini extraction, parallel OCR/detection where possible, SSE progress on the client, and an optional pre-warm script for popular papers.

## Changes

### Part 1 — Targeted single-question extraction

- `buildTargetedExtractionPrompt()` in `lib/marking/extraction-prompts.ts`
- `tryExtractFromStorage()` accepts `{ mode: 'full' | 'targeted', targetQuestion? }` in `lib/marking/storage-extract.ts`
- Single-question path uses **targeted** extraction (`lookupMarkScheme` default)
- Whole-paper path uses **full** extraction (`markWholePaperQuestion` passes `extractionMode: 'full'`)
- `lib/marking/question-number.ts` normalizes question ids for cache matching

### Part 2 — Parallelism

- QP + MS PDF downloads were already `Promise.all` in `storage-extract.ts` (unchanged)
- **Parallel OCR + early detection**: first page OCR completes, then paper detection runs on the first ~10 lines of text while remaining pages OCR in parallel (`lib/marking/single-question-pipeline.ts`)
- Full-page OCR is **not** streamed from Gemini; partial-line early detection is the available optimization

### Part 3 — Visible progress (SSE)

- **Server**: `stream=1` on `/api/mark/process` returns SSE (`lib/marking/sse.ts`, route refactor)
- Progress stages: `reading_work` (5→20%), `finding_scheme` (30→50%), `extracting_scheme` (70%, cold only), `marking` (85%), then `{ type: 'result' }`
- **Client**: `components/mark/SingleQuestionMarkingProgress.tsx` + `app/mark/page.tsx` consumes the stream (student-friendly labels via `friendlyStageLabel()`)

### Part 4 — Pre-warm script

- `scripts/prewarm-mark-schemes.mjs` — full-paper extraction for listed 9709/9702/9701/9700/9708 papers (s24, w24, s25)
- 30s pacing between extractions, Gemini retry, `scripts/prewarm-log.json` resume log
- `pnpm prewarm-schemes` / `pnpm prewarm-schemes --dry-run` (3 papers)

## Architecture

- **SSE (Option A)** for single-question marks — matches existing Omni-AI pattern; no job queue
- Single-question logic centralized in `lib/marking/single-question-pipeline.ts`; route delegates early for `upload_mode === 'single_question'`

## Verification

| Check | Status |
|-------|--------|
| `pnpm build` | Pass |
| Warm path (cached scheme) | Unchanged — DB hit skips extraction; same Claude marking |
| Whole-paper full extraction | `extractionMode: 'full'` on `lookupMarkScheme` in `markWholePaperQuestion` |
| Targeted extraction | Default for single-question `lookupMarkScheme` |
| SSE progress UI | Wired on `/mark` single-question submit |
| Pre-warm script | `pnpm prewarm-schemes --dry-run` — run locally when ready |

## Benchmarks (manual)

Cold-path before/after depends on paper size and Gemini load. Expected cold single-question: **~30–50s** (was ~90–180s) when extraction is targeted. Run one uncached paper (e.g. Sociology 9699) and one cached 9709 question to confirm warm path ~15–30s.

## Files touched

- `lib/marking/extraction-prompts.ts`
- `lib/marking/storage-extract.ts`
- `lib/marking/question-number.ts`
- `lib/marking/mark-progress.ts`
- `lib/marking/sse.ts`
- `lib/marking/single-question-pipeline.ts`
- `lib/marking/mark-runner.ts`
- `app/api/mark/process/route.ts`
- `app/mark/page.tsx`
- `components/mark/SingleQuestionMarkingProgress.tsx`
- `scripts/prewarm-mark-schemes.mjs`
- `package.json`
- `lib/marking/SPRINT_32_REPORT.md`
