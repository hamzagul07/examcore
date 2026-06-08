# Extraction Paper Samples — Phase 1.5 (Prompt C)

**Date:** 2026-06-06  
**Session:** `s24` (May/June 2024)  
**Samples:** `qp_32.pdf` (Paper 3) · `qp_42.pdf` (Paper 4)  
**Baseline:** `qp_12.pdf` (Paper 1 MCQ) — inspected in Phase 0 via Gemini Flash

---

## Mathpix run status

| Item | Status |
|------|--------|
| `lib/extraction/mathpix-client.mjs` | Implemented |
| `scripts/mathpix-sample-papers.mjs` | Ready |
| `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` in `.env.local` | **Not configured** |
| Mathpix OCR on P3 + P4 | **Blocked** — add credentials and re-run |

```bash
# After adding keys to .env.local:
node scripts/mathpix-sample-papers.mjs
# Writes scripts/mathpix-samples/{p3-practical,p4-structured}.{mmd,lines.json}
```

**Production decision (Phase 2):** Gemini 2.5 Pro is the primary extractor (`EXTRACTION_USE_MATHPIX=false`). Mathpix scaffolding remains for optional revival. Structural findings below informed `lib/extraction/pdf-parser.ts`.

---

## Paper 3 — Practical (`qp_32.pdf`)

| Field | Value |
|-------|-------|
| Storage path | `paper-pdfs/cambridge/9702/s24/qp_32.pdf` |
| File size | **1,997,344 bytes (~1.9 MB)** |
| Source | Gemini 2.5 Pro interim (Mathpix pending) |

### Structure

| Metric | Observation |
|--------|-------------|
| **Max nesting depth** | **2** — e.g. `1(c)(i)`, `2(e)(ii)` |
| **Sub-part format** | **Mixed:** lowercase letters `(a)`, `(b)` then Roman `(i)`, `(ii)` |
| **Top-level layout** | **2 long experimental questions** (not 40 flat items) |
| **Mark annotations** | **`[N]` brackets** — e.g. `[2]`, `[10]`; section totals `[Total: 20]` |
| **Paren marks** | Not observed `(3 marks)` style |

### Tables

| Density | **Low** in printed paper |
|---------|--------------------------|
| Shape | Students **create** tables in answers (e.g. record `Vs`, `T`, `1/T` in Q1(b)) |
| Splitter note | Distinguish **instructions to draw a table** vs pre-printed data tables |

### Diagrams

| Density | **Medium** (~0.25 figures/page in interim estimate) |
|---------|------------------------------------------------------|
| Content | Apparatus diagrams, graph axes, experimental setup photos |
| Challenge | Large embedded raster images drive **1.9 MB** file size — highest diagram extraction risk |

### Sample question numbers

`1(c)(i)`, `2(a)(ii)`, `2(c)`, `2(e)(i)`

### Sample excerpts

- "Record your results in a table. Include values of 1/T in your table."
- "Plot a graph of 1/T on the y-axis against Vs on the x-axis."
- "Describe four sources of uncertainty or limitations of the procedure for this experiment."

### Differences from Paper 1 MCQ

| Paper 1 (MCQ) | Paper 3 (Practical) |
|---------------|---------------------|
| 40 flat questions, depth **1** | 2 multi-part experiments, depth **2** |
| A/B/C/D options | Written observations, tables, graphs |
| No per-question marks on items | `[N]` on each leaf part |
| High diagram count (~19/paper) | Fewer figures but **larger** apparatus images |
| Formulae sheet page 2 | Procedure + evaluation language |

### Splitter notes

- Natural boundaries: **Question 1** (pages ~3–6), **Question 2** (pages ~7–11) per interim pass.
- Leaf parts carry marks; parent `(b)` may be instruction-only — validate mark sums per question.
- Must capture **uncertainty / error analysis** sections for Paper 3 style validation (Prompt B).

---

## Paper 4 — Structured (`qp_42.pdf`)

| Field | Value |
|-------|-------|
| Storage path | `paper-pdfs/cambridge/9702/s24/qp_42.pdf` |
| File size | **257,542 bytes (~252 KB)** |
| Source | Gemini 2.5 Pro interim (Mathpix pending) |

### Structure

| Metric | Observation |
|--------|-------------|
| **Max nesting depth** | **2** — e.g. `7(b)(iv)`, `1(c)(i)` |
| **Sub-part format** | **Mixed:** `(a)`, `(b)` + `(i)`, `(ii)` |
| **Top-level questions** | **~10** main numbered questions |
| **Mark annotations** | **`[N]` brackets** — `[1]`, `[2]`; totals `[Total: 10]` |
| **Paren marks** | Not primary format |

### Tables

| Density | **Low–medium** |
|---------|----------------|
| Examples | Checkbox comparison table (angular vs linear speed); data tables (nuclear masses in u; density/sound speed for water/glass) |
| Shape | Pre-printed **data tables** and **tick-box grids** — need table-aware parsing |

### Diagrams

| Density | **High** (~1 figure/page interim estimate) |
|---------|-------------------------------------------|
| Content | Fig. 4.2 SHM graphs, capacitor circuits, field diagrams |
| References | "Fig. 4.2", "Fig. 6.2" — link figures to question numbers |

### Sample question numbers

`1`, `4`, `7`, `9` (top-level); leaves like `1(c)(i)`, `4(b)(ii)`

### Sample excerpts

- "(a) Define the radian."
- "(c) (i) Calculate the angular speed ω of the disc."
- "(a) Explain how Fig. 4.2 shows that the oscillations of the block are simple harmonic."

### Differences from Paper 1 MCQ

| Paper 1 | Paper 4 |
|---------|---------|
| Recognition / distractors | Definitions, derivations, multi-step calculations |
| Single depth | **2-level** nesting common |
| MCQ tables for options | **Data tables** + **Fig. N.M** diagrams |
| 16 pages (Gemini Phase 0) | ~8–12 pages typical (interim Gemini said 24 — **verify with Mathpix**) |
| No working space | Answer spaces on paper; method marks expected |

### Splitter notes

- Treat each **top-level question (1–10)** as a unit; sub-parts `(a)(i)` are leaves with `[N]` marks.
- Data + Formulae front matter (like P1) — exclude from question numbering.
- Fig. references must map to `extracted_diagrams` rows.

---

## Cross-paper comparison (P1 · P3 · P4)

| Property | P1 MCQ `qp_12` | P3 Practical `qp_32` | P4 Structured `qp_42` |
|----------|----------------|----------------------|------------------------|
| Nesting depth | **1** | **2** | **2** |
| Sub-parts | None | `(a)` + `(i)` | `(a)` + `(i)` |
| Mark format | Total on cover only | `[N]` per leaf | `[N]` per leaf |
| Tables | MCQ option tables | Student-drawn tables | Printed data/grid tables |
| Diagram density | High (small figures) | Medium (large apparatus) | High (graphs/circuits) |
| Questions per paper | ~40 | ~2 experiments | ~10 |

---

## What “P3: 70 variants” means

**Not** 70 different practical experiments in one session. It is the **count of Paper 3 question paper PDFs** (`qp_3x.pdf`) across **all 18 sessions** in storage (2020–2025).

| Paper | QP PDF count | Avg per session | Component codes seen |
|-------|-------------|-----------------|----------------------|
| P1 | 44 | 2.4 | `11`–`14` |
| P2 | 44 | 2.4 | `21`–`24` |
| **P3** | **70** | **3.9** | **`31`–`38`** |
| P4 | 44 | 2.4 | `41`–`44` |
| P5 | 44 | 2.4 | `51`–`54` |

### Why Paper 3 has more PDFs

Cambridge releases **more Paper 3 variants per series** than Papers 1/2/4/5 because:

1. **Different practical experiments** — each variant (`31`, `32`, …) is often a **different lab activity**, not just a timezone reprint.
2. **Administrative zones** — May/June typically has **5** P3 variants (`31`–`35`); Oct/Nov often has **5–7** (`31`–`36`, sometimes `37`–`38`).
3. **Feb/March** usually has **one** P3 variant per year (`33` only in our inventory).

**Per-session examples:**

| Session | P3 components |
|---------|-----------------|
| `s24` | `31`, `32`, `33`, `34`, `35` (5 variants) |
| `s25` | `31`–`35`, `37`, `38` (7 variants — no `36`) |
| `w24` | `31`, `33`, `34`, `35`, `36` (5 variants — no `32`) |
| `m24` | `33` only (1 variant) |

So **70 = sum over sessions**, not “70 experiments in one exam”. The extraction pipeline must key on `(session, component)` e.g. `(s24, 32)` not just “Paper 3”.

---

## Phase 1 schema (completed)

| Table | Purpose |
|-------|---------|
| `extracted_questions` | Leaf + parent question rows from PDFs |
| `extracted_mark_points` | Mark scheme bullets |
| `extracted_diagrams` | Cropped figures + alt-text |
| `syllabus_objectives` | Fine-grain syllabus bullets |
| `question_topic_tags` | Question ↔ objective M:N |
| `extraction_jobs` | Idempotent job tracking |

- **Migration:** `supabase/migrations/20260606_extraction_pipeline.sql`
- **Rollback:** `supabase/migrations/20260606_extraction_pipeline.down.sql`
- **Types:** `lib/extraction/types.ts`
- **`mark_schemes`:** untouched (93 rows verified after rollback test)

### Rollback test (dev project)

No Supabase branch existed (`list_branches` → empty). Rollback validated on the **development project**:

1. Applied `extraction_pipeline` migration — 6 tables created ✓
2. Ran `20260606_extraction_pipeline.down.sql` — all 6 tables + policies dropped ✓
3. Confirmed `mark_schemes` still has **93 rows** ✓
4. Re-applied schema via `extraction_pipeline_reapply_after_rollback_test` ✓

---

## Next step (Phase 2)

**Blocked on Mathpix credentials** for production-quality MMD samples. Once keys are in `.env.local`:

1. `node scripts/mathpix-sample-papers.mjs`
2. Update this doc with Mathpix `lines.json` diagram/table counts
3. Proceed to `lib/extraction/pdf-parser.ts` (Mathpix primary, Gemini Pro fallback)

**Stop here per Prompt C** — awaiting review before Phase 2 parser.
