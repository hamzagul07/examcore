# Sprint B.1 Report — Fine-grain extraction + behavioral verification

Generated: 2026-05-29

## Section D: Overall verdict — **AMBER**

- **Fine-grain extraction:** All priority subjects failed (Gemini `fetch failed` / 503). Syllabus JSON unchanged from Sprint A (coarse grain).
- **Sprint B behavior:** All 6 automated tests **PASS** — leaf-level mastery logic works as designed.
- **Shippable:** Progress UI and marking granularity are correct; data density improves when extraction succeeds later.

---

## Section A: Fine-grain extraction results

Orchestrator: `node scripts/run-fine-grain-sequential.mjs` (~66 min, per-subject delays + 3 retries).

| Code | Subject | Before | After | Target | Status | Attempts | Final state |
|------|---------|--------|-------|--------|--------|----------|-------------|
| 9700 | Biology | 44 | 44 | 150–250 | ✗ | 3 | failed (fetch) |
| 9702 | Physics | 76 | 76 | 130–200 | ✗ | 3 | failed (fetch) |
| 9701 | Chemistry | 90 | 90 | 130–200 | ✗ | 3 | failed (fetch) |
| 9708 | Economics | 53 | 53 | 100–180 | ✗ | 3 | failed (fetch) |
| 9489 | History | 27 | 27 | 50–150 | ✗ | 3 | failed (503) |
| 9990 | Psychology | 60 | 60 | 80–150 | ✗ | 3 | failed (503) |
| 9618 | Computer Science | 45 | 45 | 80–140 | ✗ | 3 | failed (503) |
| 9706 | Accounting | 34 | 34 | 60–120 | ✗ | 3 | failed (fetch) |
| 9231 | Further Math | 24 | 24 | 80–150 | ✗ | 3 | failed (fetch) |
| 9609 | Business | 116 | 116 | 80–180 | skipped | 0 | in range |
| 9699 | Sociology | 35 | 35 | 50–100 | ✗ | 3 | failed (fetch) |
| 9084 | Law | 53 | 53 | 60–120 | skipped | 0 | marginal skip |
| 9488 | Islamic Studies | 23 | 23 | 35–70 | skipped | 0 | marginal skip |
| 9607 | Media Studies | 18 | 18 | 30–70 | skipped | 0 | marginal skip |

Raw log: `lib/syllabi/FINE_GRAIN_RUN.json`

---

## Section B: Grain verification (post-run)

`node scripts/verify-syllabus-grain.mjs`:

| Subject | Parent | PDF points | JSON leaves | Verdict |
|---------|--------|------------|-------------|---------|
| 9700 | Cell structure | 33 | 2 | ❌ coarse |
| 9702 | Kinematics | 9 | 1 | ❌ coarse |
| 9489 | P2 European | 3 outline studies | 3 | ✅ pass (outline grain) |

Sciences still need bullet-level re-extraction when Gemini is stable.

---

## Section C: Sprint B behavioral tests

`node scripts/verify-sprint-b-behavior.mjs` → `lib/syllabi/SPRINT_B_BEHAVIOR.json`

| Test | Result | Detail |
|------|--------|--------|
| 1 Leaf tagging in marking | **PASS** | Physics attempt `e82bad4b…` on `9702/22` tagged leaf `7.1` (not parent `7` alone) |
| 2 One attempt = Sampled | **PASS** | `calculateLeafMastery`: 100% with 1 attempt → `sampled`, not `exam_ready` |
| 3 Parent aggregation | **PASS** | 1 sampled + 4 unattempted → parent `sampled` |
| 4 Math regression | **PASS** | 9709 topic `1.6` at 1 attempt → `sampled`; 38 topics |
| 5 Coverage leaf count | **PASS** | Leaf count 76 > 25 parents (9702) |
| 6 Action plan blindspot | **PASS** | Recommends leaf `3.1.1` with parent context |

---

## Section E: What you need to do

1. **Re-run extraction when Gemini is healthy** (one subject at a time):
   ```bash
   node scripts/extract-syllabi.mjs --force --fine-grain --subject 9700
   # wait 30s, then 9702, 9701, …
   ```
   Or: `node scripts/run-fine-grain-sequential.mjs`

2. **Verify grain:** `node scripts/verify-syllabus-grain.mjs`

3. **Re-verify behavior:** `node scripts/verify-sprint-b-behavior.mjs`

4. **No code changes required** for Sprint B mastery/UI unless Test 1 fails after Physics marking.

---

## Files created (this sprint)

| File | Purpose |
|------|---------|
| `scripts/run-fine-grain-sequential.mjs` | Per-subject extraction orchestrator |
| `scripts/verify-sprint-b-behavior.mjs` | 6 behavioral tests |
| `lib/syllabi/FINE_GRAIN_RUN.json` | Extraction run log |
| `lib/syllabi/SPRINT_B_BEHAVIOR.json` | Test results |
| `lib/syllabi/SPRINT_B1_REPORT.md` | This report |

No changes to `lib/mastery.ts`, marking pipeline, or UI components.
