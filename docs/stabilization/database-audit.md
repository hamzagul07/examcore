# Database state audit — Phase 1

**Generated:** 2026-06-08  
**Scope:** Read-only Supabase queries (no recovery actions taken)  
**Project:** `mcnqxokprggjadtlloyr`

---

## Executive summary

The extraction database is **heavily fragmented**. Tier 1 subject **9702** has strong pilot-era sessions (m24/s24) but the recent bulk recovery run (m22→w23) left **74 failed jobs** and several sessions with questions but **no mark scheme links**. **9700 and 9701 have zero extracted questions.** Tier 2 pilot debris (9709, 9618, 9706, 9708) is partial and should be ignored for stabilization.

**Critical finding:** `extracted_diagrams` has **0 rows globally**, while completed 9702 jobs report **221 diagrams extracted** in `extraction_jobs.diagrams_extracted`. The diagram persistence path has never successfully written to the DB.

**Gate:** Do not run extraction until Hassan reviews this audit and approves recovery scope.

---

## 1. Question coverage by subject and session

| Subject | Session (DB) | Year | Questions | Papers | Avg conf | Notes |
|---------|--------------|------|-----------|--------|----------|-------|
| **9702** | February/March | 2024 | 182 | 5 | 0.979 | Pilot — full |
| **9702** | May/June | 2024 | 168 | 5 | 0.991 | Pilot (s24) — full |
| **9702** | October/November | 2024 | 580 | 5 | 0.971 | w24 bulk — QPs only |
| **9702** | February/March | 2023 | 180 | 5 | 0.973 | m23 bulk — QPs only |
| **9702** | October/November | 2023 | 19 | 1 | 0.953 | w23 bulk — 1 QP partial |
| **9702** | February/March | 2022 | 11 | 1 | 1.000 | m22 bulk — 1 QP partial |
| **9702** | May/June | 2022 | 14 | 1 | 1.000 | s22 bulk — 1 QP partial |
| **9702** | October/November | 2022 | 2 | 1 | 1.000 | w22 bulk — near-empty |
| 9618 | May/June | 2024 | 37 | 1 | 1.000 | Tier 2 debris |
| 9706 | May/June | 2024 | 16 | 1 | 1.000 | Tier 2 debris |
| 9708 | May/June | 2024 | 86 | 2 | 1.000 | Tier 2 debris |
| 9709 | May/June | 2024 | 25 | 1 | 0.960 | Tier 2 debris |

**Missing from `extracted_questions` entirely:**
- 9702 **s23** (May/June 2023) — 17 failed QP jobs, 0 questions persisted
- **9700 Biology** — no rows
- **9701 Chemistry** — no rows

---

## 2. Mark scheme linking coverage

| Subject | Session | Year | Leaf Qs | Qs w/ marks | Mark points |
|---------|---------|------|---------|-------------|-------------|
| **9702** | Feb/Mar 2024 (m24) | 2024 | 150 | **150** | 257 |
| **9702** | May/Jun 2024 (s24) | 2024 | 141 | **141** | 264 |
| **9702** | Oct/Nov 2024 (w24) | 2024 | 464 | **0** | 0 |
| **9702** | Feb/Mar 2023 (m23) | 2023 | 151 | **0** | 0 |
| **9702** | Oct/Nov 2023 (w23) | 2023 | 16 | **0** | 0 |
| **9702** | Feb/Mar 2022 (m22) | 2022 | 10 | **10** | 25 |
| **9702** | May/Jun 2022 (s22) | 2022 | 11 | **11** | 60 |
| **9702** | Oct/Nov 2022 (w22) | 2022 | 1 | **0** | 0 |

**Pattern:** Pilot sessions (m24, s24) are fully linked. Bulk-recovery sessions extracted QPs but **mark scheme linking never completed** for m23, w24, w23 (and w22 has almost no data).

---

## 3. Tagging coverage

| Subject | Session | Year | Leaf Qs | Tagged | High conf (≥0.6) | Needs review |
|---------|---------|------|---------|--------|------------------|--------------|
| **9702** | Feb/Mar 2024 | 2024 | 150 | **150** | 150 | 0 |
| **9702** | May/Jun 2024 | 2024 | 141 | **141** | 141 | 0 |
| **9702** | Feb/Mar 2023 | 2023 | 151 | **151** | 151 | 0 |
| **9702** | Oct/Nov 2023 | 2023 | 16 | **16** | 16 | 0 |
| **9702** | Feb/Mar 2022 | 2022 | 10 | **10** | 10 | 0 |
| **9702** | May/Jun 2022 | 2022 | 11 | **11** | 11 | 0 |
| **9702** | Oct/Nov 2024 | 2024 | 464 | **0** | 0 | 0 |
| **9702** | Oct/Nov 2022 | 2022 | 1 | **0** | 0 | 0 |

Tagging ran on pilot + m23 leaf questions but **not on w24** (464 untagged leaf questions). Tagging without mark points is possible but w24 also lacks MS links.

---

## 4. Diagram persistence

```sql
SELECT COUNT(*) FROM extracted_diagrams;  -- 0
```

| Subject | Session | Diagrams in DB | With description | Pending |
|---------|---------|----------------|------------------|---------|
| *(all)* | — | **0** | 0 | 0 |

Meanwhile, completed 9702 jobs report:

| Metric | Value |
|--------|-------|
| `diagrams_extracted` (job counter) | **221** |
| `questions_extracted` (job counter) | 1,294 |
| Total completed-job cost | **$42.32** |

**Conclusion:** Diagram detection/cropping may run during extraction, but **no row has ever been inserted into `extracted_diagrams`**. Phase 2 investigation is required before trusting diagram-dependent content generation.

---

## 5. Extraction job state (global)

| Status | PDF type | Jobs | Total cost | Avg retries |
|--------|----------|------|------------|-------------|
| completed | question-paper | 28 | $38.48 | 0.00 |
| completed | mark-scheme | 8 | $4.48 | 0.00 |
| failed | question-paper | 122 | $2.54 | 1.08 |
| failed | mark-scheme | 11 | $1.17 | 1.00 |
| pending | mark-scheme | 5 | $0.00 | 0.00 |
| running | question-paper | 2 | $0.00 | 1.00 |

**9702-only job counts:** 35 completed · 74 failed · 5 pending · 0 running (9702)

Two **running** jobs exist globally (9709 s24 qp_42/qp_43) — stale from aborted Tier 2 rerun; safe to reset via existing stale-job logic.

---

## 6. 9702 session health (bulk recovery target)

Path codes map to DB session names as: `m22`→Feb/Mar 2022, `s22`→May/Jun 2022, `w22`→Oct/Nov 2022, `m23`→Feb/Mar 2023, `s23`→May/Jun 2023, `w23`→Oct/Nov 2023, `m24`→Feb/Mar 2024, `s24`→May/Jun 2024, `w24`→Oct/Nov 2024.

| Session | Completed jobs | Failed jobs | Pending | Health |
|---------|----------------|-------------|---------|--------|
| **m22** | 2 | 4 | 0 | **Partial** — 1 QP + 1 MS OK; 4 QPs timed out at 600s |
| **s22** | 2 | 18 | 0 | **Failed** — 1 QP partial; 16 QPs timed out; 2 MS linker failures (Paper 5) |
| **w22** | 0 | 18 | 0 | **Failed** — all jobs failed (timeouts + 429s) |
| **m23** | 5 | 0 | 5 | **Partial** — all 5 QPs completed ($7.83); **5 MS jobs still pending** |
| **s23** | 0 | 17 | 0 | **Failed** — all 17 QPs failed (429 RESOURCE_EXHAUSTED) |
| **w23** | 1 | 17 | 0 | **Failed** — 1 QP completed; 16 QPs + 1 MS failed (429 + 1×600s timeout) |
| m24 | 10 | 0 | 0 | **Complete** (pilot) |
| s24 | *(skipped in bulk code)* | — | — | **Complete** (pilot, not in job table for this run) |
| **w24** | 15 | 0 | 0 | **Partial** — all 15 QPs completed ($20.50); **no MS jobs run** |

### Failure mode breakdown (9702 recovery jobs)

| Error pattern | Count (approx) | Sessions |
|---------------|----------------|----------|
| `timed out after 600000ms` | ~35 QPs | m22, s22, w22, w23 |
| `429 RESOURCE_EXHAUSTED` | ~30 QPs + MS | s23, w23, w22 |
| MS linker validation | 2 MS | s22 (ms_52, ms_53 — Paper 5 unmatched headers) |
| Leaf mark sum below threshold | 3 QPs | s22/w22 Paper 5 variants |

The 600s timeouts are consistent with **pre-timeout-fix hangs** under concurrency=6 (Vertex calls blocked until per-PDF cap). The new 120s call timeout should convert these to fast retry/fail cycles.

---

## 7. Jobs requiring recovery

**Criteria:** `status IN ('failed','running')` OR (`completed` AND `cost_usd = 0`)

**9702 recovery list (priority for Phase 4–5):**

| Session | Failed QPs | Failed MS | Pending MS | Action |
|---------|------------|-----------|------------|--------|
| m22 | 4 | 0 | 0 | Re-run 4 timed-out QPs |
| s22 | 16 | 2 | 0 | Re-run QPs; investigate Paper 5 MS linker |
| w22 | 17 | 1 | 0 | Full session re-run |
| m23 | 0 | 0 | 5 | Run 5 pending MS jobs |
| s23 | 17 | 0 | 0 | Full session re-run (post cooldown) |
| w23 | 16 | 1 | 0 | Re-run failed QPs + ms_31 |
| w24 | 0 | 0 | ~10* | Run MS extraction + linking |

\*w24 has 15 completed QP jobs but no MS jobs in `extraction_jobs` yet — MS pass never started.

**Non-9702 (deferred — out of stabilization scope):** 110+ failed Tier 2 jobs (9618, 9706, 9708, 9709). Two stale `running` jobs on 9709.

---

## 8. Syllabus objectives

| Subject | Objectives in DB |
|---------|------------------|
| 9702 | 301 |
| 9706 | 154 |
| 9700 | **0** |
| 9701 | **0** |

9702 syllabus is ready for tagging. 9700/9701 need `pnpm extract:syllabus` before any bulk work (Phase 7).

---

## 9. Answers to the five audit questions

### Q1: What sessions have full data?

**9702 only:**
- **m24** (Feb/Mar 2024) — questions ✓ · mark points ✓ · tags ✓ · cost ~$10
- **s24** (May/Jun 2024) — questions ✓ · mark points ✓ · tags ✓ · cost ~$10 (pilot)

### Q2: What sessions have partial data?

| Session | Has | Missing |
|---------|-----|---------|
| m22 | 1 QP + marks + tags | 4 QPs |
| s22 | 1 QP + partial marks | 16 QPs, 2 MS |
| m23 | 5 QPs + tags | 5 MS links |
| w23 | 1 QP + tags (16 leaf) | 16 QPs, MS |
| w24 | 15 QPs (580 questions) | MS links, tags |
| w22 | ~nothing useful | Everything |

**s23 has zero questions** despite 17 job attempts.

### Q3: What jobs need re-running?

- **9702:** 74 failed + 5 pending MS = **79 jobs** need action
- **Global stale:** 2 `running` (9709) — reset, not re-extract unless Tier 2 resumed later
- **Tier 2:** 110+ failed — ignore for now

Idempotency will skip the 35 completed 9702 jobs on re-run.

### Q4: Why does `extracted_diagrams` have 0 rows?

Jobs report 221 diagrams extracted across completed 9702 QPs, but the `extracted_diagrams` table is empty. Likely causes (Phase 2 will confirm):

1. `diagram-persist.ts` write path never reached or silently fails
2. Storage bucket `extracted-diagrams` permission/missing object issue
3. Migration `description_status` applied but inserts fail on schema mismatch
4. Diagram persistence disabled/skipped in bulk path despite detection

**Not a tagging or MS issue — isolated to diagram DB writes.**

### Q5: Health of the most recent Tier 1 bulk run (m22, s22, w22, s23, w23)?

**Poor.** The run completed with $7.86 logged cost but:

- **m22:** 20% QP coverage (1/5 papers)
- **s22:** ~6% QP coverage; MS linker failed on Paper 5
- **w22:** ~0% — total failure
- **s23:** 0% — all 429s
- **w23:** ~6% QP coverage (1/17); MS failed

Root causes: Vertex 429 saturation at concurrency=6, 600s per-PDF timeouts from hung API calls (pre-120s fix), and no MS pass for sessions where only QPs completed.

**m23** (also in scope) fared better on QPs (5/5) but MS jobs remain **pending**.

---

## 10. Recommended recovery priority (for Hassan approval)

| Priority | Phase | Scope | Rationale |
|----------|-------|-------|-----------|
| 1 | **2** | Diagram 0-rows root cause | Blocks Biology pilot + content gen |
| 2 | **3** | Throughput baseline @ c=1 | Evidence before any bulk |
| 3 | **4** | w23 controlled recovery | Validates timeout fix on real 429/MS failures |
| 4 | **5** | m22,s22,w22,s23 + m23 MS + w24 MS | Complete 9702 evidence pool |
| 5 | **6** | Evidence pool validation | Confirm `getLessonEvidence` richness |
| 6 | **7** | 9700, 9701 | Only after 9702 clean |

**Do not start Phase 2+ until this audit is reviewed.**

---

## Raw query reference

Queries executed 2026-06-08 against production Supabase. Full recovery job list (~120 rows) available via:

```sql
SELECT source_pdf_path, pdf_type, status, retry_count, cost_usd,
       LEFT(error_message, 120), started_at, completed_at
FROM extraction_jobs
WHERE status IN ('failed', 'running')
   OR (status = 'completed' AND cost_usd = 0)
ORDER BY source_pdf_path;
```
