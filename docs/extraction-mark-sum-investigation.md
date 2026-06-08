# Mark sum investigation — qp_42 (s24)

**Root cause (confirmed):** Chunked 8-page extraction dropped Q1 and Q2 sub-parts entirely.

## Evidence from failed run (80/100 marks)

| Question | Rows | Leaf marks | Issue |
|----------|------|------------|-------|
| Q1 | 1 | **0** | Only top-level `1` — all `(a)(b)(i)` sub-parts missing (~10 marks) |
| Q2 | 1 | **0** | Only top-level `2` — all sub-parts missing (~10 marks) |
| Q3–Q10 | partial | 80 | Present but some numbering corruption (e.g. `7(ii)` without letter level) |

**Not primarily a chunk-boundary split issue:** Q1/Q2 content lives on pages 3–6 (chunk 1, pages 1–8). Gemini returned parent stubs without children — JSON truncation / incomplete chunk response, not pages 8–9 boundary loss.

## Fix applied

1. **Single-shot Pro extract** for PDFs ≤32 pages OR ≤1.5 MB (qp_42: 24 pages, 257 KB).
2. **Overlapping chunks** (10 pages, 2-page overlap) for larger papers.
3. **Stronger prompt:** extract every question 1–N with all sub-parts.
4. **Improved dedupe:** merge marks from duplicate question_numbers across chunks.
5. **`validateMarkSum()`:** fails job if leaf sum < 90% of expected (P4 = 100).

## Numbering pattern (Q7)

Cambridge sometimes uses direct roman children: `7(ii)`, `7(iii)` without a letter level. We keep faithful `question_number` and sortable `question_path` (`07.ii` sorts between `07.b` and `08`).
