# Project scope: ground IB points marking in official mark schemes

**Goal:** make IB **points** marking (sciences + maths Papers 1/2/3) scheme-grounded
instead of model-derived, so marks come from the official IB markpoints rather
than a scheme the model invents at mark time.

**Not in scope:** IB **criteria** marking (essays/IA/TOK/arts) — that's already
scheme-grounded (verbatim band descriptors are fully populated; see audit).

---

## 1. Audit — current state (verified against prod DB, 2026-07-09)

| ib_* table | rows | status |
|---|---|---|
| ib_subject | 17 | ok |
| ib_component | 91 | ok (42 points, 49 criteria) |
| ib_criterion | 201 | ok |
| ib_criterion_band | 881 | ok — verbatim descriptors, criteria fully covered |
| **ib_points_scheme** | **1** | **the gap** |

**Points coverage: 1 of 42 components has an official scheme.** By subject
(all `with_scheme = 0` except the single maths-aa sample):

- STEM (priority): biology 4, chemistry 4, physics 4, maths-aa 5 (1 seeded), maths-ai 5, computer-science 5 → ~27 components
- Others: business-management 3, design-technology 5, economics 1, geography 3, language-b 2, psychology 1

**So 41 points components are marked by the derive-then-mark fallback (model
invents the scheme).** Criteria components (49) are unaffected — already grounded.

### Data format (established — the one seeded sample)
`ib_points_scheme.marks` (jsonb), per QUESTION:
```json
{ "question": "1", "max_marks": 5,
  "parts": [ { "part": "(a)(i)", "marks": [{"code":"A1"}], "answer": "f(6)=2" },
             { "part": "(b)", "marks": [{"code":"M1"},{"code":"A1"},{"code":"A1"}], "note": "Award M1 for..." } ] }
```
plus `paper_ref` ("M21/5/MATHX/SP1/ENG/TZ1/XX/M Q1"), `accept_alternatives`, `ecf_rules` (jsonb `{general: "..."}`).

### Code readiness (what's already built vs missing)
- ✅ Schema + `resolveComponentForMarking` (lib/ib/assessment-catalog.ts) resolves a component.
- ✅ Marking prompt `buildIbCatalogPointsPrompt` already **accepts** an `officialScheme` and marks against it when present.
- ❌ **`resolveComponentForMarking` hardcodes `officialScheme: null`** (line ~234) — it fetches the points scheme rows but only reads the general accept/ECF text; it never passes the per-question markpoints. **This is the missing wire even for the data that exists.**
- ❌ **No question-matching** — nothing maps a student's uploaded question → the right `ib_points_scheme` row (by paper_ref + question number).
- ❌ **No IB paper/component selector in the /mark UI** — `ibComponentKey` is plumbed through the API but nothing in `app/mark/page.tsx` sets it, so `resolvedIb` rarely resolves. Marking falls to the practice/derive path.
- ✅ Ingestion pattern exists — `scripts/extract-mark-scheme.mjs` / `extract-question-paper.mjs` (built for Cambridge: PDF → LLM extraction → DB) is directly adaptable.

---

## 2. Design — phased

### Phase 0 — Wire the plumbing (NO licensed data needed) · ~2–4 days
Make the system *use* a scheme the moment one exists. Validate against the 1 seeded Math AA question.
1. **Fix `officialScheme`**: in `resolveComponentForMarking`, when a matched scheme row exists, return its `marks` jsonb as `officialScheme` (instead of null). Thread it through `ResolvedIbComponent` → `buildIbCatalogPointsPrompt` (already accepts it).
2. **Question matching**: add `matchPointsScheme(component, questionNumber, session?)` — pick the `ib_points_scheme` row by question number (and paper session/paper_ref when known). Fall back to derive-then-mark when no match (so nothing regresses).
3. **UI selector**: in `app/mark/page.tsx`, for an IB subject in scanned/practice mode, add a Paper (1/2/3) + Level (HL/SL) picker that sets `ibComponentKey`/`ibLevel`. Question number can come from detection or an optional field.
4. **Gate**: mark the seeded Math AA SP1 Q1 → confirm it uses the official markpoints (not a derived scheme). Deterministic win.

### Phase 1 — Ingestion pipeline · ~3–5 days eng + ongoing content
5. Adapt `extract-mark-scheme.mjs` → `extract-ib-points-scheme.mjs`: official IB mark-scheme PDF → per-question `{question, max_marks, parts[...]}` + accept/ECF → upsert `ib_points_scheme` (component_id + paper_ref).
6. Add a `course:run`-style CLI + a per-question QA/validation pass (markpoints sum to max_marks; codes valid; answer present).
7. **Legal gate:** requires licensed official IB mark-scheme PDFs (the criteria seeds came from TSM — same access needed for schemes). This is the true blocker, not the code.

### Phase 2 — Rollout (content, prioritized) · ongoing
8. STEM first (Bio/Chem/Physics/Maths AA/AI/CS ≈ 27 components), most-recent syllabus + a few sessions each. Then the rest.
9. Per subject: ingest → QA sample → enable. Keep derive-then-mark as the fallback for un-ingested questions, so coverage grows without regressions.

---

## 3. Effort & sequencing

| Phase | Eng effort | Gate |
|---|---|---|
| 0 — plumbing + selector | 2–4 days | none (self-contained) |
| 1 — ingestion pipeline | 3–5 days | **licensed IB mark-scheme PDFs** |
| 2 — content rollout | ongoing (~½–1 day/subject-session of extraction + QA) | licensing + QA capacity |

**Data volume:** 42 points components × several sessions × ~10–40 questions = low
thousands of question-schemes. Extraction is automatable (LLM, like Cambridge),
but **QA is the real cost** — a *wrong* official scheme marks worse than the
model-derived fallback, so each batch needs spot-checking before enabling.

## 4. Risks / decisions to make first
- **Licensing** (biggest): confirm legit access to official IB mark-scheme PDFs. Without it, Phase 1+ can't start; Phase 0 still delivers value on the seeded data + any future schemes.
- **QA bar:** an inaccurate ingested scheme is worse than the fallback → need a "verified" flag per scheme and only mark against verified rows.
- **Matching reliability:** student's uploaded question → correct scheme row. Mitigated by the UI selector (user picks paper) + detection + graceful fallback to derive-then-mark.

## 5. Recommended first step
**Do Phase 0 now** — it's self-contained, needs no licensed data, fixes the
`officialScheme: null` wire + adds the selector, and is provable against the one
seeded scheme. It makes the platform *ready* so that ingested schemes light up
immediately. Phase 1 starts once the licensing question is answered.
