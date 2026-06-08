# Bulk extraction damage diagnostic

**Date:** 2026-06-07  
**Subject:** 9702

## Executive summary

The progress log showed s23/w23 as `partial` with **$0.00 cost** — not `completed`. The database is mostly consistent: **zero jobs** have `status=completed AND cost_usd=0`. Failed quota hits are stored as `failed` with 429 `RESOURCE_EXHAUSTED` in `error_message`.

**Good news:** m24, w24, and m23 (QPs only) have real question data (~930 questions, high confidence).  
**Bad news:** s23, w23, m22 have **no questions**; m23 mark schemes missing; **no diagrams** anywhere; s22/w22 never started.

---

## Questions by year/session

| Year | Session | Questions | High conf (≥0.85) | Avg conf |
|------|---------|-----------|-------------------|----------|
| 2024 | February/March (m24) | 182 | 173 | 0.979 |
| 2024 | May/June (s24*) | 168 | 164 | 0.991 |
| 2024 | October/November (w24) | 580 | 539 | 0.971 |
| 2023 | February/March (m23) | 180 | 169 | 0.973 |

\*May/June 2024 data is from an **earlier** extraction run, not bulk s23 (2023).

**Missing entirely:** 2023 May/June (s23), 2023 Oct/Nov (w23), 2022 Feb/March (m22), all of s22/w22.

**Total:** 1,110 questions across 4 populated year/session pairs.

---

## Diagrams

| Metric | Value |
|--------|-------|
| `extracted_diagrams` rows (all subjects) | **0** |

Diagram pipeline has not populated the table. Worked-example diagram wiring is ready but has nothing to attach.

---

## extraction_jobs by session code

| Session | Jobs | Completed | Failed | Running | Total cost | Verdict |
|---------|------|-----------|--------|---------|------------|---------|
| **m24** | 10 | 10 | 0 | 0 | $9.98 | ✅ Genuine — QPs + MS |
| **w24** | 15 | 15 | 0 | 0 | $20.50 | ⚠️ QPs only — no MS jobs run |
| **m23** | 10 | 5 (QP) | 5 (MS) | 0 | $7.83 | ⚠️ Partial — questions yes, mark schemes no |
| **s23** | 17 | 0 | 17 | 0 | $0.00 | ❌ Husk — all 429 quota |
| **w23** | 17 | 0 | 17 | 0 | $0.00 | ❌ Husk — all 429 quota |
| **m22** | 5 | 0 | 4 | 1 | $0.00 | ❌ Husk — quota + stale `running` |
| s22, w22 | — | — | — | — | — | Not started |

**Zero-cost completed jobs:** 0 (DB does not falsely mark completions).

---

## Root cause

`gemini-2.5-pro` hit the **daily quota** (1,000 requests/day). After ~m23, the runner continued attempting PDFs; each failed after retries with 429. Progress log logged `partial` + `$0.00` and moved to the next session instead of pausing.

---

## Recommendation

**Scrub-and-resume** (not accept partial):

1. ✅ Reset zero-cost `failed`/`running` jobs → `pending` (done via `scripts/reset-silent-failure-jobs.mjs`)
2. Resume after quota reset: `m22,s22,w22` + re-run `s23,w23` + `m23` MS passes
3. Do **not** re-extract m24/w24 QPs (already good); add w24 + m23 mark schemes
4. Diagram extraction remains blocked until QP pipeline produces diagram rows

---

## Fixes applied (post-diagnostic)

- Quota-aware pause: 429 `RESOURCE_EXHAUSTED` daily quota → write `tmp/bulk-extraction-state.json`, exit cleanly
- Resume gating: wait for `retry_after` if quota hit within last 24h
- Session status: never `completed` unless ≥8 successful PDFs (or 50% of session PDFs) and `costUsd > 0`
- `resetSilentFailureJobs()` for zero-cost failed/running jobs
