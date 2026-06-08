# Phase 2 — Diagram pipeline fix + backfill investigation

**Generated:** 2026-06-08  
**Gate:** Stop here — await approval before Phase 3 (throughput baseline)

---

## Root cause

Three compounding issues explain **0 rows in `extracted_diagrams`** despite **221** `extraction_jobs.diagrams_extracted`:

### 1. CLI never persisted diagrams (primary)

`scripts/extract-question-paper.mjs --persist` called `persistExtractedQuestions` only. Diagrams were detected and written to `scripts/extraction-output/*.json` (e.g. s24 `qp_42` export shows **15 diagrams**, `diagramPassMs: 507596`) but **never uploaded or inserted**.

Pilot sessions (m24, s24) have full question rows in DB with **no** matching `extraction_jobs` rows for s24 QPs — extraction happened via CLI dry-run + manual persist.

### 2. Bulk path wired late / bucket missing at run time

`bulk-extract.ts` now calls `persistExtractedDiagrams` after questions, but completed bulk jobs have:

- **`extracted-diagrams` storage:** 0 files before this fix (bucket created in migration `20260608_extraction_optimizations.sql`)
- **`extraction_jobs.metadata`:** `{}` on all diagram-heavy jobs — no bounding boxes or storage paths saved
- **No thrown errors** on completed jobs → persist either **not in the deployed code path** during those runs, or never reached because uploads would have failed before bucket existed

### 3. Silent skip mode (now fixed)

`persistExtractedDiagrams` previously returned `{ inserted: 0 }` without error when all diagrams failed `matchDiagramToQuestion`. Job counters used `result.diagrams.length` (detected), not `inserted` — allowing **“completed with 16 diagrams_extracted”** while DB stayed empty.

---

## Fix applied

| File | Change |
|------|--------|
| `lib/extraction/diagram-persist.ts` | Step logging; `DiagramPersistError`; throw if `inserted === 0` when diagrams detected |
| `scripts/extract-question-paper.mjs` | `--persist` now calls `persistExtractedDiagrams`; `--skip-smoke` flag |
| `lib/extraction/bulk-extract.ts` | Stores `diagram_persist` result in job `metadata` |
| `lib/extraction/diagram-backfill.ts` | Diagram-only re-extraction for completed QPs |
| `lib/extraction/question-tree.ts` | `loadQuestionsForDiagramMatch()` for stable DB question IDs |
| `scripts/backfill-missing-diagrams.mjs` | Backfill CLI (uses `npx tsx`) |
| `scripts/test-diagram-persist-live.mjs` | Live DB+storage smoke without Vertex |

---

## Validation

### Unit test — PASS

```
npx tsx lib/extraction/diagram-persist.insert.test.ts
```

Mock Supabase: **1 diagram row inserted**, upload path verified.

### Live write path — PASS

```
npx tsx scripts/test-diagram-persist-live.mjs cambridge/9702/s24/qp_42.pdf
```

- Storage upload to `extracted-diagrams` bucket: **OK**
- DB insert into `extracted_diagrams`: **OK** (1 smoke-test row for question `1(a)`)
- Proves bucket, RLS (service role), and schema (`description_status`) are correct

### Full qp_42 diagram re-extraction — BLOCKED (Vertex 429)

```
npx tsx scripts/backfill-missing-diagrams.mjs --pdf=cambridge/9702/s24/qp_42.pdf
```

All diagram pages hit `RESOURCE_EXHAUSTED` (429). **0 diagrams recovered** from this run. Retry after Vertex cooldown.

---

## Backfill investigation

| Source | Result |
|--------|--------|
| `storage.objects` in `extracted-diagrams` | **0 files** before smoke test (1 after) |
| `extraction_jobs.metadata` | **Empty** — no bbox/path recovery possible |
| Filename pattern backfill | **Not applicable** — nothing in storage |

**Verdict:** The historical **221 diagram PNGs are not recoverable** from storage or job metadata. Recovery requires **diagram-only re-extraction** via:

```powershell
npx tsx scripts/backfill-missing-diagrams.mjs --subject=9702
# or single PDF:
npx tsx scripts/backfill-missing-diagrams.mjs --pdf=cambridge/9702/m24/qp_42.pdf
```

**Candidate jobs:** 26 completed 9702 QPs with `diagrams_extracted > 0` (~221 diagrams expected). Plus pilot PDFs (e.g. s24 `qp_42`) that have `extracted_questions` but no `extraction_jobs` row — script handles via `--pdf` fallback.

**Defer full backfill until after Phase 3 baseline** — Vertex is currently 429-saturated; running 26 PDFs now would fail like qp_42.

---

## Backfill scorecard

| Metric | Value |
|--------|-------|
| Expected from historical jobs | ~221 diagrams |
| Recovered from storage/metadata | **0** |
| Recovered via re-extraction (this session) | **0** (429 blocked) |
| Live path proof (smoke test) | **1** row |
| Permanently lost without re-extraction | **~221** (until backfill script runs successfully) |

---

## Logging sample (fixed path)

```
[diagram-persist] cambridge/9702/s24/qp_42.pdf: 1 diagram(s) detected, 1 question(s) for matching
[diagram-persist] upload Fig. smoke-test → cambridge/9702/s24/.../p4-1-Fig._smoke-test.png (question 1(a))
[diagram-persist] DB insert for question_id=ec400b02-... order=1
[diagram-persist] cambridge/9702/s24/qp_42.pdf: done inserted=1 skipped=0 uploads=1
```

---

## Approval needed for Phase 3

Before throughput baseline:

1. Confirm diagram fix approach is acceptable
2. Schedule full backfill after Vertex cooldown (post Phase 3 or parallel at c=1)
3. Optionally delete smoke-test row: `image_storage_path LIKE '%smoke-test%'`

**Do not start Phase 3 until approved.**
