# Tier 2 pilot report — s24 extraction

**Generated:** 2026-06-07  
**Scope:** 9709 Mathematics, 9618 Computer Science, 9706 Accounting, 9708 Economics  
**Command (attempt 1):** `pnpm bulk:extract --subjects=9709,9618,9706,9708 --sessions=s24 --concurrency-per-subject=3`  
**Command (attempt 2):** Sequential rerun per subject at `--concurrency=2` after migration + job reset  

---

## Executive summary

| Metric | Result |
|--------|--------|
| Wall clock | ~48 min (parallel) + ~2h 45m (sequential rerun) |
| Estimated API cost logged | ~$8.93 (parallel) + $0.00 (rerun sessions reported $0) |
| PDFs in storage (s24) | 108 total (36+24+24+24) |
| PDFs with extracted questions in DB | **8** (2+1+1+4) |
| Total questions in DB | **164** (25+37+16+86) |
| Mark points linked | 58 |
| Topic tags | **0** (tagging phase never ran — all sessions `failed`/`partial`) |
| Adaptive concurrency floor | Dropped to **2** on all workers |

**Verdict: Pilots are NOT approved for Phase 4 bulk.** Vertex sustained `429 RESOURCE_EXHAUSTED` under 12-way parallelism; even sequential reruns at concurrency 2 hit heavy rate limits. Partial data from the first parallel burst is useful for subject-specific quality signals, but coverage is far below pilot requirements.

### Infrastructure fixes applied mid-pilot

1. Applied Supabase migration `extraction_optimizations` (`metadata` column, `description_status`, `extracted-diagrams` bucket).
2. `markJobCompleted` now falls back gracefully if `metadata` column is missing.
3. Multi-subject session reports now write `s24-{subject}-report.md` (single-subject runs still overwrite `s24-report.md`).

---

## Cross-subject

| Issue | Detail |
|-------|--------|
| Vertex 429s | Dominant failure mode on ~90% of PDF attempts in rerun |
| Missing `metadata` column | Caused qp_23 (9709) to fail job completion in attempt 1 — fixed via migration |
| Tier 1 bulk overlap | 9702 bulk (PID 34736) ran until 15:24 UTC, competing for quota during attempt 1 |
| DB connection pool | No saturation observed (no `fetch failed` streaks after migration) |
| Session reports | Overwritten when using single-subject CLI — use multi-subject mode or per-subject log files for audit trail |

**Recommendation before re-pilot:** Run **one subject at a time**, `--concurrency=1`, 30–60s pause between PDFs if 429s persist. Do not launch 4-subject parallel until a full single-subject s24 completes cleanly.

---

## 9709 Mathematics

### Coverage

| Paper | Questions | Sum marks | PDFs extracted | Expected (s24) |
|-------|-----------|-----------|----------------|----------------|
| P2 | 25 | 58 | qp_21, qp_23 | 6 variants × 6 papers ≈ 36 PDFs |

Only **2/18** question papers produced rows. No P1/P3/P4/P5/P6 streams extracted in this pilot.

### Mark sums

- qp_23: leaf sum **50/50 PASS** (export JSON)
- qp_21: extracted but MS linking incomplete

### Subject-specific checks (LaTeX)

Samples from DB parse cleanly in KaTeX:

| Sample | KaTeX |
|--------|-------|
| `$|5x+7|>|2x-3|$` | ✅ |
| `$$\int_{0}^{\pi} \sin(x) dx$$` (display in qp_23 Q4) | ✅ |
| Parametric `$x = 4\cos^2 t$` + display `$$...$$` blocks | ✅ |
| Iteration / logarithm inline math | ✅ |

Vector notation `\mathbf{r}`, `\vec{v}` not yet seen in extracted set but KaTeX accepts them in isolation.

**Issue:** Parent question 3 has `extraction_confidence: 0` (diagram-only stem) — expected for figure-heavy stems without diagram rows yet.

### Tagging audit

Not run (session failed before tagging).

### Sample export (`cambridge_9709_s24_qp_23_pdf.json`)

```json
{
  "question_number": "4",
  "marks": 7,
  "question_text": "A curve is defined by the parametric equations\n$$ x = 4 \\cos^2 t, \\quad y = \\sqrt{3} \\sin 2t, $$\nfor values of $t$ such that $0 < t < \\frac{1}{2}\\pi$.\n\nFind the equation of the normal..."
}
```

### 9709 verdict

**Quality promising on extracted subset; coverage insufficient.** Re-run all 18 QPs at concurrency 1 before approving.

---

## 9618 Computer Science

### Coverage

| Paper | Questions | Sum marks | PDFs | Expected |
|-------|-----------|-----------|------|----------|
| P3 | 37 | 75 | qp_32 only | 12 QPs |

**1/12** question papers. Mark sum **75/75 PASS** on qp_32.

### Subject-specific checks (code)

**Good:** Pseudocode extracted with fenced blocks and language hint:

```
Complete the pseudocode to find an item in a 1D array `Widgets`...
```pseudocode
DECLARE Widgets : ARRAY[1:50000] OF STRING
...
```

**Good:** RPN evaluation question includes markdown table for stack states.

**Bad:** Raw `<img src="https://i.imgur.com/0000000.png">` in Q6 logic-circuit stem — same class of issue fixed for 9702 pilots. Diagram cropper should replace this; until then post-process should strip `<img>` tags.

**Bad:** 9 top-level question numbers have empty `question_text` (parent shells only) — similar to economics case-study pattern.

### Tagging audit

Not run.

### 9618 verdict

**Code/pseudocode formatting is pipeline-ready.** Logic-circuit `<img>` hallucination must be fixed before bulk. Coverage 8% of QPs — re-pilot required.

---

## 9706 Accounting

### Coverage

| Paper | Questions | Sum marks | PDFs | Expected |
|-------|-----------|-----------|------|----------|
| P4 | 16 | 50 | qp_41 only | 12 QPs |

**1/12** question papers. Mark sum **50/50** on extracted paper — matches expected structured paper total.

### Subject-specific checks (tables / currency)

- Extracted text is arithmetic prose ("Calculate the selling price…") — no spurious `$...$` math mode on currency in samples.
- **No structured `tables[]` in `raw_extraction_data`** for persisted rows — financial statements in source PDF likely live in parent/setup sections not yet extracted (only one variant succeeded).
- Currency symbols not observed breaking KaTeX in the 16 stored rows.

### Tagging audit

Not run.

### 9706 verdict

**Single-paper arithmetic extraction looks sound.** Cannot validate multi-column financial statement table parsing until more papers extract. Re-pilot all 12 QPs.

---

## 9708 Economics

### Coverage

| Paper | Questions | Sum marks | PDFs | Expected |
|-------|-----------|-----------|------|----------|
| P1 (MCQ) | 30 | 30 | qp_13, qp_21 (partial) | 12 QPs |
| P2 (case study) | 56 | 300 | qp_22, qp_23 | 12 QPs |

**4/12** question papers. P2 mark sum **300** across variants — consistent with 4×[25+25+25+25] case-study papers.

### Subject-specific checks (long text / essays)

**Good:** Case study introductions preserved to **2,450 characters** (Turkey inflation article) without truncation.

**Good:** MCQ options extracted as markdown tables in P1 (e.g. Q20 fiscal/monetary policy grid).

**Expected Tier 3 flag:** **12/86** rows have empty or near-empty `question_text` — these are parent question numbers (2–5) under case-study stems where sub-parts carry the actual prompts. Acceptable for v1; essay-style Paper 4 `[25]` single-part questions not present in this partial set.

**Diagrams:** 0 cropped (Opt A — `description_status=pending` not exercised).

### Tagging audit

Not run.

### Sample (`cambridge_9708_s24_qp_23_pdf.json` — Q1 stem, truncated)

```json
{
  "question_number": "1",
  "question_text": "Turkey's unconventional way of managing its economy\n\nThe relationship between interest rates and the general price level..."
}
```

### 9708 verdict

**Long-form prose extraction works.** Empty parent rows need lesson-generator awareness. Re-pilot for full paper coverage and P4 essay samples.

---

## Job status (s24, all attempts)

| Subject | completed | failed | Notes |
|---------|-----------|--------|-------|
| 9709 | 1 | 19 | ms_23 only completed MS |
| 9618 | 0 | 13 | Data from transient success before job marked failed |
| 9706 | 0 | 13 | qp_41 data persisted |
| 9708 | 0 | 16 | 4 QPs persisted |

---

## Next steps (Hassan review gate)

1. **Do not launch Phase 4 bulk** until a full s24 pilot completes per subject with ≥80% PDF success.
2. Re-run pilots sequentially:

```powershell
# One subject at a time, concurrency 1
pnpm bulk:extract --subject=9709 --sessions=s24 --concurrency=1 --global-cost-cap=40
pnpm bulk:extract --subject=9618 --sessions=s24 --concurrency=1 --global-cost-cap=40
pnpm bulk:extract --subject=9706 --sessions=s24 --concurrency=1 --global-cost-cap=40
pnpm bulk:extract --subject=9708 --sessions=s24 --concurrency=1 --global-cost-cap=40
```

3. After clean extraction, run `pnpm tag:questions` per subject and repeat 20-question stratified audit (target ≥85%).
4. Strip `<img>` from 9618 stems in post-process (same as 9702 pilot fix).
5. Spot-check 9618 code blocks in browser (`CourseRichText` fenced-code path).

---

## Approval status

| Subject | Quality signal (partial) | Coverage | Approved for Phase 4? |
|---------|-------------------------|----------|----------------------|
| 9709 | ✅ LaTeX | ❌ 11% PDFs | **No** |
| 9618 | ⚠️ code good, `<img>` bad | ❌ 8% PDFs | **No** |
| 9706 | ✅ arithmetic | ❌ 8% PDFs | **No** |
| 9708 | ✅ long prose | ❌ 33% PDFs | **No** |

**Overall: STOP — re-pilot required at lower concurrency.**
