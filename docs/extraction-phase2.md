# Extraction Phase 2 — Parser + Splitter (Prompt C)

**Date:** 2026-06-06  
**Status:** Complete — stopped before Phase 3 (mark scheme linker)

---

## Decision: Gemini Pro primary, Mathpix feature-flagged off

| Setting | Value |
|---------|-------|
| Primary extractor | **Gemini 2.5 Pro** (`task: pdf-extraction`) |
| Mathpix | `EXTRACTION_USE_MATHPIX=false` (default) |
| Default `extraction_method` | `gemini-pro` |
| Scaffolding preserved | `lib/extraction/mathpix-client.mjs`, `analyze-mmd.mjs` |

---

## Phase 2 blocker fixes (2026-06-06)

### Mark sum validation (qp_42: 80 → 100)

**Root cause:** 8-page chunked Pro extraction returned Q1/Q2 as empty parent stubs (no sub-parts). Content lives on pages 3–6 inside chunk 1 — incomplete Gemini JSON, not a page-boundary split.

**Fixes:**
- Single-shot Pro for PDFs ≤32 pages or ≤1.5 MB (qp_42: 24 pages, 257 KB)
- Overlapping chunks (10 pages, 2-page overlap) for larger papers
- Stronger prompt: extract every question 1–N with all sub-parts
- Dedupe merges marks across overlapping chunks
- `validateMarkSum()` fails job if leaf sum &lt; 90% of expected (P4 = 100) or &gt;2 below expected

See `docs/extraction-mark-sum-investigation.md`.

### Numbering normalization

- Faithful `question_number` from Gemini (e.g. `7(ii)`)
- Sortable `question_path` (`07.ii` sorts between `07.b` and `08`)
- `detectRomanOnlySubparts()` documents direct-roman patterns in `splitterIssues`

### Flash 503 / timeout retry

- Exponential backoff 1s → 2s → 4s → 8s + jitter (`lib/marking/gemini-retry.ts`)
- Retries on 503, `UND_ERR_HEADERS_TIMEOUT`, and transient network errors
- Total retries recorded in `extraction_jobs.error_message`

### Diagram pipeline (real-paper tested)

- pdfjs worker preload for Node/Windows
- Pixel-coordinate bbox normalization (Gemini often returns pixels, not 0–1)
- Single PDF open for multi-page diagram pass
- Scans pages referenced by extracted questions (not every page)

---

## Dry-run results (s24, re-run after fixes)

| Paper | Questions | Mark sum | Chunks | Single-shot | Diagrams | Manual review |
|-------|-----------|----------|--------|-------------|----------|---------------|
| **qp_42** (P4) | 58 | **100/100** ✓ | 1 | yes | see latest JSON | ~6 (LaTeX) |
| **qp_12** (P1 MCQ) | 40 | **40/40** ✓ | 1 | yes | skipped | 0 |

```bash
pnpm extract:paper cambridge/9702/s24/qp_42.pdf          # with diagrams
pnpm extract:paper cambridge/9702/s24/qp_12.pdf --skip-diagrams
```

Output: `scripts/extraction-output/<path_slug>.json`

---

## Module map

| Module | Role |
|--------|------|
| `lib/extraction/pdf-parser.ts` | Orchestrator: extract → split → validate → diagrams |
| `lib/extraction/gemini-extractor.ts` | Gemini Pro PDF → raw question JSON (single-shot / chunked) |
| `lib/extraction/mark-sum-validate.ts` | Expected totals + 90% threshold |
| `lib/extraction/pdf-chunk.ts` | Single-shot limits + overlapping chunks |
| `lib/extraction/question-splitter.ts` | Hierarchy, paths, roman-only detection |
| `lib/extraction/diagram-extractor.ts` | Page render → bbox detect → crop → describe |
| `lib/extraction/pdf-page-render.ts` | pdfjs-dist + @napi-rs/canvas |
| `lib/marking/gemini-retry.ts` | Backoff + retry stats |

---

## Next: Phase 3 — Mark scheme linker

Not started until qp_42 mark sum confirmed within ±2 of 100 (**confirmed: 100/100**).
