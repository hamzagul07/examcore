# IB Marking Engine — Research & Design (Phase 1)

**Status:** DESIGN ONLY. No marking logic changed in this pass. This document maps the
current engine, proposes an architecture that handles both IB assessment paradigms, and
produces a precise manifest of official IB documents to supply in phase 2.

**Accuracy discipline:** IB assessment differs structurally by subject group and component.
This document commits to *structure* and *assessment-model classification* only. It does **not**
reproduce IBO criterion wording, band descriptors, or exact mark allocations from memory.
Every per-subject section carries a **Verified / Inferred / NEEDED** ledger. Anything not
verifiable from the codebase is flagged for you to supply. Over-flagging is deliberate.

---

## Part 0 — Current-state map (verified from code)

### 0.1 How marking works today

- **Engine:** AI-based marker on Google Gemini, run inside Next.js route handlers (no edge
  function). Entry `app/api/mark/process/route.ts` → single-question path
  `lib/marking/single-question-pipeline.ts` → `markSingleQuestion()` in
  `lib/marking/mark-runner.ts` → prompt router `lib/marking/build-marking-prompt.ts` → Gemini.
- **IB vs Cambridge distinction** happens in two places:
  - *Prompt routing:* `build-marking-prompt.ts:38-39` — `isIb = markScheme?.board === 'IB Diploma' || isIbSubjectCode(subjectCode)`.
  - *Result presentation:* `components/MarkingResultView.tsx:133-135` — `isIb = isIbSubjectCode(badgeSubjectCode)`, `boardLabel = isIb ? 'IB' : 'Cambridge'`; drives banner copy and suppresses the A-Level grade pill.
- **Subject/component/level determination:** for IB, the upload carries **only**
  `mark_intent=practice_question` + `practice_subject_code=<ib-…-hl|sl>`
  (`app/mark/page.tsx:919-948`). Level (HL/SL) is baked into the subject code; **no component
  and no level are transmitted.**
- **Mark-scheme representation:** table `mark_schemes`, column `mark_scheme jsonb`
  (`MarkSchemeRow`, `lib/marking/types.ts:15-27`). For IB practice there is usually no DB row,
  so a **synthetic** scheme is built at runtime by `lib/marking/ib-practice-scheme.ts:23`
  (`buildIbPracticeMarkScheme`).
- **Marking styles** (`lib/marking/types.ts:1`): `'mcq' | 'point_based' | 'level_of_response' | 'mixed'`.
  Note this single axis currently conflates *paradigm* (points vs criteria) with *format*.

### 0.2 Guardrails (do not touch)

- **Billing/quota rollout is mid-flight.** `lib/billing/*`, usage/enforcement paths
  (`reserveMarkUsage`/`finalizeMarkReservation` in `route.ts`), and result-recording (the
  `attempts` insert at `single-question-pipeline.ts:313-329`) are **out of scope**. This work is
  the criteria engine, not the quota gate.

### 0.3 Verified structural gaps (these shape the design)

| # | Gap | Evidence |
|---|-----|----------|
| G1 | **No component dimension for IB.** Only `practice_subject_code` is sent; no Paper/IA/EE/TOK selector. | `app/mark/page.tsx:919-948`; `PastPaperSelectorFields.tsx:79-84` returns "not used for IB". |
| G2 | **No HL/SL control.** Level is encoded in the subject code (`ib-biology-hl` vs `-sl`); `LEVELS` exposes IB as one level. | `lib/profile-options.ts:42-48`; `page.tsx` subject `<select>` only. |
| G3 | **IB is forced into practice mode.** Past-paper/whole-paper tabs disabled for IB. | `page.tsx:261-265, 653-661, 792-801, 1252-1287`. |
| G4 | **Criteria live at *subject* level, not per component.** e.g. Visual Arts has 3 components but one shared `criteria` array. | `IbMarkingProfile.criteria` (`marking-config.ts:20-35`). |
| G5 | **Markband/criterion results barely render.** `criteria_results` + `band_result` UI is gated behind `marks.length > 0` (`MarkingResultView.tsx:172`), but IB LOR and IB criterion prompts return `marks_awarded: []` by design. So a real IB markband result shows summary + `strengths` only; the band meter and per-criterion breakdown never mount. | `prompts.ts:482, 549`; `MarkingResultView.tsx:172-240`; `MarkAuditPanel.tsx:95-124`. |
| G6 | **`criteria_results` is a second-class citizen in normalization.** Not an unwrap trigger in `coerceMarkingResult`, not checked by `isUsableMarkingResult`, not math-normalized, and **dropped** by the whole-paper normalizer. | `normalize-math.ts:262-360`; `whole-paper.ts:239-246`. |
| G7 | **`mark_scheme` jsonb is polymorphic (5 shapes)** with two incompatible band encodings: extraction uses numeric `marks_min`/`marks_max`; synthetic IB practice uses a `marks: '1-2'` **string range**. `extractMarkSchemeRubric` understands only the numeric form and is **blind to `criteria`/`assessment`**. | `extraction-prompts.ts:70-123`; `ib-practice-scheme.ts:6-41`; `mark-scheme-display.ts:44-117`. |
| G8 | **Base tables not in version control.** No `CREATE TABLE mark_schemes`/`attempts` in `supabase/migrations/`; only ALTERs + RLS exist. Attempt-level board/subject/component/level is **not persisted** — it is inferred at read time. | migrations dir; `single-question-pipeline.ts:336-340`. |

> **Design consequence:** the two paradigms (points vs criteria-markband) are already *modelled*
> (types `MarkAwarded`, `LorBandResult`, `IbCriterionResult` all exist in `types.ts`) but are
> **routed on a single conflated `MarkingStyle` axis**, **stored** in a polymorphic untyped blob,
> and **rendered** through a points-shaped UI path. The redesign makes assessment-model a
> first-class, per-component property and gives each paradigm its own storage, routing, and
> presentation contract.

---

## Part 1 — Subject scope (CONFIRM WITH ME)

Designing for your tentative high-traffic set spanning both paradigms. **Please confirm/finalize.**

| Subject | Levels | Dominant paradigm (external) | Notes |
|---------|--------|------------------------------|-------|
| Mathematics: Analysis & Approaches (AA) | HL, SL | points/markscheme | + Exploration IA (criteria) |
| Physics | HL, SL | points/markscheme | ⚠️ **2025 curriculum** — see §2 version flags |
| Biology | HL, SL | points/markscheme | ⚠️ **2025 curriculum** |
| History | HL, SL | criteria-markband (essays) + source points | + Historical Investigation IA (criteria) |
| Economics | HL, SL | criteria-markband (papers) | + Portfolio IA (criteria) |
| Psychology | HL, SL | criteria-markband + short-answer points | + Experimental Study IA (criteria) |
| Language B (Spanish B *or* French B) | HL, SL | criteria-markband (productive/oral) + receptive points | pick one to start |
| **TOK** (Core, cross-subject) | — | criteria-markband | Essay (external) + Exhibition (internal) — own module |
| **EE** (Core, cross-subject) | — | criteria-markband | Generic + subject-specific criteria — own module |

Existing profiles today already cover 38 IB codes (`marking-config.ts`), incl. `ib-tok`,
`ib-extended-essay`, but with **subject-level** criteria only and no component routing (G1, G4).

---

## Part 2 — Per-subject assessment maps (STRUCTURE + ledger)

> **Reading the ledger.** **Verified** = confirmable from the codebase or stated as
> paradigm-structural fact. **Inferred** = high-confidence structure I believe is correct but that
> is version-dependent and must be confirmed against the guide. **NEEDED** = exact criterion
> wording, band descriptors, and mark allocations I will **not** guess — supply the official doc.
> Component lists below are **Inferred** (structure) pending the subject guide; treat HL/SL paper
> counts as provisional until confirmed.

### 2.0 Version flags (read first — accuracy is cycle-dependent)

- **Sciences (Biology, Physics):** a **new curriculum with first assessment 2025** restructured
  the science courses (paper structure and IA changed materially vs the pre-2025 guides). I will
  **not** assert the 2025 paper/IA structure from memory. → **NEEDED: current (first-assessment-2025)
  Biology and Physics subject guides.** Flag if your traffic is still on the legacy cycle.
- **Math AA:** current guide **first assessment 2021**. Confirm you are on this cycle.
- **History:** current guide **first assessment 2017**. Confirm.
- **Economics:** current guide **first assessment 2022**. Confirm.
- **Psychology:** current guide first assessment cycle **to be confirmed** (guide revised late-2010s).
- **Language B:** current guide **first assessment 2020**. Confirm.
- **TOK:** current guide **first assessment 2022** (essay + exhibition model). Confirm.
- **EE:** current guide **first assessment 2018** (5 criteria, with reflections). Confirm.

If any subject in your traffic sits on a different cycle than above, the criteria and paper
structure differ — tell me and I will branch the design by `guide_version`.

### 2.1 Mathematics: Analysis & Approaches (AA)

- **Components (Inferred):**
  - Paper 1 — **points/markscheme** (method/answer marks). HL and SL both; content differs.
  - Paper 2 — **points/markscheme** (technology-permitted). HL and SL.
  - Paper 3 — **points/markscheme**, **HL only** (extended problem-solving).
  - Internal Assessment: the **Mathematical Exploration** — **criteria-markband** (a single
    fixed criteria set A–E applied to one coursework piece).
- **Points components — how schemes work (Verified paradigm):** method marks (M), accuracy/answer
  marks (A), independent marks; **ECF / error-carried-forward** across parts; "accept" alternative
  forms and equivalent methods; "AG" answer-given constraints. Our engine already models M/A/B and
  ECF (`extraction-prompts.ts:80-97`, `ib-practice-scheme.ts`). Points path is the closest to
  production-ready.
- **Ledger:**
  - Verified: paradigm classification per component; engine has a points contract already.
  - Inferred: HL has P1/P2/P3, SL has P1/P2; IA is criteria A–E.
  - **NEEDED:** exact Exploration criteria letters/names, **per-criterion max marks and total**,
    and full band descriptors → **Math AA guide (first assessment 2021), IA assessment criteria
    section.** Also representative **official paper markschemes** (P1/P2/P3, HL & SL) for points
    calibration.

### 2.2 Physics  ·  2.3 Biology  (Sciences — 2025 curriculum)

- **Components (Inferred, PENDING 2025 guide — do not rely on pre-2025 memory):**
  - Written papers (a Paper 1 objective/data section and a Paper 2 extended/data-response section;
    the 2025 restructure changed the number and internal split of papers vs legacy — **must confirm**).
  - Internal Assessment: the **Scientific Investigation** — **criteria-markband** (single criteria
    set applied to one report). The 2025 IA criteria differ from legacy — **must confirm**.
- **Paradigm mix (Verified/structural):** objective/MCQ sections → **mcq**; short structured and
  data-response → **points/markscheme** (with "accept"/ECF); the IA → **criteria-markband**.
  Extended-response items may use **markbands** rather than pure point marks — confirm from the guide.
- **Ledger:**
  - Verified: sciences mix mcq + points (externals) with a criteria-based IA.
  - Inferred: everything about the **exact 2025 paper structure and IA criteria** — treat as
    unconfirmed.
  - **NEEDED (high priority):** **Biology guide** and **Physics guide** for the **current
    first-assessment-2025 cycle** — for (a) definitive paper structure & marks, (b) IA assessment
    criteria letters/names/max-marks/descriptors, (c) whether any external items are markband-based.
    Plus **official 2025-series papers + markschemes** (or specimen papers) per level.

> Because Sciences are your points-paradigm anchor **and** are on the freshest, most-changed cycle,
> these guides are the single highest-value documents to supply first.

### 2.4 History

- **Components (Inferred):**
  - Paper 1 — source-based (prescribed subject): a mix of short **points**-marked source questions
    and a longer **markband** essay-style question.
  - Paper 2 — world-history topics: **markband** essays.
  - Paper 3 — **HL only**, regional depth study: **markband** essays.
  - Internal Assessment: the **Historical Investigation** — **criteria-markband** (a small fixed
    set of criteria, e.g. source evaluation / investigation / reflection).
- **Paradigm (Verified/structural):** predominantly **criteria-markband** for essays and IA; the
  Paper 1 source questions include **points**-style items. This subject is the clearest example of a
  **per-component paradigm split** — the engine must route Paper 1 sub-questions and Paper 2/3
  essays differently.
- **Ledger:**
  - Verified: mixed paradigm; markband-dominant.
  - Inferred: paper roles above; IA has ~3 criteria.
  - **NEEDED:** **History guide (first assessment 2017)** — Paper 1 markbands + generic source
    mark allocations, Paper 2 markbands, Paper 3 markbands, and **IA criteria (letters, names,
    max-marks, descriptors)**. Sample markschemes for Paper 1 source questions.

### 2.5 Economics

- **Components (Inferred):**
  - Paper 1 — extended-response essays: **markband**.
  - Paper 2 — data response: **markband** (with some points-style calculation credit).
  - Paper 3 — **HL only**, policy/quantitative: mix of **points** (quantitative) + **markband**.
  - Internal Assessment: **Portfolio of three commentaries** — **criteria-markband** (fixed
    criteria applied per commentary).
- **Ledger:**
  - Verified: markband-dominant with quantitative points in HL Paper 3 and Paper 2 calculations.
  - Inferred: paper roles; IA = 3 commentaries scored against shared criteria.
  - **NEEDED:** **Economics guide (first assessment 2022)** — external markbands per paper,
    HL Paper 3 quantitative mark treatment, and **IA commentary criteria (letters/names/max/
    descriptors)**.

### 2.6 Psychology

- **Components (Inferred):**
  - Paper 1 — mix of short-answer (**points**) and extended-response (**markband**).
  - Paper 2 — options, extended response: **markband**. (HL/SL differ in number of options/questions.)
  - Paper 3 — **HL only** (approaches to research): **markband** / structured.
  - Internal Assessment: **Experimental Study report** — **criteria-markband**.
- **Ledger:**
  - Verified: markband-dominant + short-answer points on Paper 1.
  - Inferred: paper roles, HL/SL differences, IA criteria set.
  - **NEEDED:** **Psychology guide (confirm current cycle)** — external markbands, short-answer
    mark treatment, and **IA criteria**. Confirm HL/SL paper structure.

### 2.7 Language B (Spanish B / French B) — pick one to start

- **Components (Inferred):**
  - Paper 1 — **productive writing**: **criteria-markband** (a small set of criteria, e.g.
    language / message / conceptual understanding).
  - Paper 2 — **receptive skills** (listening + reading): **points/markscheme** (answer key +
    accept-marking).
  - Individual Oral (IO) — internal oral assessment: **criteria-markband**.
  - (HL/SL differ in text types, length, and some criteria maxima.)
- **Ledger:**
  - Verified: receptive = points; productive + oral = criteria-markband.
  - Inferred: criteria counts and HL/SL differences.
  - **NEEDED:** **Language B guide (first assessment 2020)** — Paper 1 writing criteria and IO
    criteria (letters/names/max/descriptors), HL vs SL differences; receptive markschemes.

### 2.8 TOK (Core module — cross-subject)

- **Components (Inferred):**
  - **TOK Essay** (external) — assessed with a **single global assessment instrument**
    (holistic markband, not multi-criterion).
  - **TOK Exhibition** (internal) — assessed with its **own single assessment instrument**
    (holistic markband).
- **Note vs current code:** `ib-tok` today models criteria **A/B** at subject level
  (`marking-config.ts:54-67`). Confirm whether the current cycle uses A/B sub-criteria or a single
  holistic instrument per component — this determines whether TOK routes as `criteria` or `markband`.
- **Ledger:**
  - Verified (structural): TOK has two separate components (essay + exhibition), each its own instrument.
  - **NEEDED:** **TOK guide (first assessment 2022)** — the **Essay assessment instrument** and the
    **Exhibition assessment instrument** verbatim (band descriptors + max marks each).

### 2.9 EE (Core module — cross-subject)

- **Structure (Inferred):** a **single set of 5 criteria (A–E)** applied to the essay, plus
  **subject-specific interpretation** guidance layered on the generic criteria.
- **Note vs current code:** `ib-extended-essay` models A–E today (`marking-config.ts:46-52`) — the
  letters are likely right but **max marks and descriptors are NEEDED**.
- **Ledger:**
  - Verified (structural): EE = generic A–E + subject-specific guidance.
  - **NEEDED:** **EE guide (first assessment 2018)** — the **general A–E criteria (names, max-marks,
    descriptors)** and the **subject-specific EE criteria/interpretation** for each subject in scope
    (e.g. EE in History, EE in Biology).

---

## Part 3 — Proposed architecture (design, no code)

### 3.1 Principle: make **assessment-model** a first-class, per-component property

Replace the single conflated `MarkingStyle` routing axis with an explicit, per-component
discriminated model:

```
assessment_model = 'points' | 'criteria'
  points   → response_format ∈ { mcq, structured_points }   → marks_awarded[] contract
  criteria → criteria set with per-criterion markbands       → criteria_results[] contract
             (holistic single-instrument = a criteria set of size 1)
```

TOK holistic and pure LOR essays are represented as `criteria` with **one** criterion (the global
instrument) — this unifies "single markband" and "multi-criterion" under one contract and removes
the current `band_result`-vs-`criteria_results` split (G5, G6).

### 3.2 Data model — a normalized IB assessment catalog (new, additive)

New tables (additive; **does not touch** `mark_schemes`/`attempts` base schema or billing):

```
ib_subject            (code PK, name, group, level_scope, guide_version, first_assessment_year)
ib_component          (id PK, subject_code FK, component_key, label, level,        -- 'paper_1'|'paper_2'|'paper_3'|'ia'|'ee'|'tok_essay'|'tok_exhibition'
                       assessment_model, response_format, max_marks,               -- level ∈ 'HL'|'SL'|'both'
                       source_document_id FK)
ib_criterion          (id PK, component_id FK, letter, name, max_marks, ordinal,
                       source_document_id FK)                                       -- licensed text
ib_criterion_band     (id PK, criterion_id FK, marks_min, marks_max, descriptor,    -- licensed descriptor text
                       source_document_id FK)
ib_points_scheme      (id PK, component_id FK, paper_ref, marks jsonb,              -- reuse existing points shape
                       accept_alternatives jsonb, ecf_rules jsonb, source_document_id FK)
ib_source_document    (id PK, title, doc_type, subject_code, cycle_version,         -- provenance / licensing
                       first_assessment_year, storage_path, supplied_at)
```

Key properties:

- **Per-component criteria (fixes G4):** criteria hang off `ib_component`, not the subject — so
  Visual Arts' three components, or History Paper 1 vs Paper 2, can carry different criteria.
- **Both paradigms cleanly (fixes G7):** points components reference `ib_points_scheme`; criteria
  components reference `ib_criterion`/`ib_criterion_band`. No polymorphic guessing.
- **Copyright/licensing (see §3.5):** every row that contains IBO text carries
  `source_document_id`, so licensed content is quarantined, auditable, versioned, and removable —
  **no IBO wording lives in feature code.**
- **Versioning:** `guide_version` / `cycle_version` let two cycles coexist (critical for Sciences 2025).

**How the existing flow consumes it:** `build-marking-prompt.ts` gains a resolver that, given
(subject, component, level), loads the component's `assessment_model` and either its
`ib_points_scheme` or its `ib_criterion[]`+bands, and dispatches to the matching prompt builder.
The synthetic `buildIbPracticeMarkScheme` becomes a fallback only; real components resolve from the
catalog. Marking-time joins fetch band descriptors by ID — the prompt is *assembled from licensed
rows*, never from hardcoded strings.

### 3.3 Selection flow — add the missing axes (fixes G1, G2, G3)

New information architecture for an IB submission:

```
Board = IB
  → Subject        (Biology, History, …  OR Core: TOK, EE)
     → Level        (HL | SL)             [skip when component is level-agnostic or Core]
        → Component (Paper 1 | Paper 2 | Paper 3 | Internal Assessment
                      | EE | TOK Essay | TOK Exhibition)   [filtered by subject×level]
           → routes to that component's assessment_model + instrument/markscheme
```

- Level and Component become **transmitted form fields** (today only `practice_subject_code` is
  sent). Add `ib_component_key` + `ib_level` to the upload payload and thread them into the
  pipeline input.
- **Core modules** (TOK, EE) are selected as their own "subject"; EE then asks for the *host
  subject* to pick subject-specific criteria.
- Component options are **derived from `ib_component`** for the chosen subject×level, so the picker
  can never offer a component we have no instrument for.
- Past-paper mode can be **re-enabled for points components** once official IB markschemes are
  ingested; criteria components stay in the coursework/essay upload flow.

### 3.4 Engine application + presentation per model (fixes G5, G6)

- **Points components:** existing `marks_awarded[]` contract, ECF and accept-alternatives — already
  supported; extend with per-component scheme from `ib_points_scheme`. Renders through the existing
  ExamSheet path.
- **Criteria components:** `criteria_results[]` contract (one entry per criterion, each selecting a
  band from `ib_criterion_band`), summed to a total. **Presentation must be de-gated:** today the
  criteria/band UI only mounts when `marks.length > 0` (`MarkingResultView.tsx:172`). Redesign:
  branch top-level on `assessment_model` (or on presence of `criteria_results`/`band_result`), so
  markband results render a band meter + per-criterion breakdown **without** requiring a points
  array. Also carry `criteria_results` through `coerceMarkingResult`, `isUsableMarkingResult`,
  `normalizeMarkingResult`, and the whole-paper normalizer (all currently drop it).
- **Credible presentation:** extend the existing board-aware view — IB criteria results show
  criterion letter/name, awarded band + level, band descriptor, and per-criterion justification
  (the `MarkAuditPanel` markup at `MarkAuditPanel.tsx:95-124` already exists; it just needs to be
  reachable for criteria-only results, and to render `strengths`/`improvements`).

### 3.5 Storage of licensed criteria/markschemes (no hardcoded IBO text)

- You upload official guides/instruments → stored as `ib_source_document` (private Supabase
  storage + a DB row).
- A **one-time ingestion step** (phase 2) transcribes the relevant criteria/bands/markschemes from
  each licensed doc into `ib_criterion` / `ib_criterion_band` / `ib_points_scheme`, each stamped
  with `source_document_id`.
- At marking time the engine **references** these rows to assemble the prompt. Feature code holds
  **IDs and structure only**; all copyrighted wording lives in licensed data rows tied to their
  source and version, and can be revoked/updated per cycle without code changes.

---

## Part 4 — Document manifest (the phase-2 checklist)

Gather in this order (each subject guide is one document that yields *multiple* extractions, so
guides come first; past-paper markschemes and the Core instruments follow).

### Tier 1 — Subject guides (one per subject; highest yield)

| # | Document (supply current cycle) | I will extract |
|---|--------------------------------|----------------|
| 1 | **Biology guide — first assessment 2025** | External paper structure & marks; **IA (Scientific Investigation) criteria** letters/names/max/descriptors; whether any external items are markband-based |
| 2 | **Physics guide — first assessment 2025** | Same as Biology |
| 3 | **Mathematics AA guide — first assessment 2021** | Paper structure (HL P1/P2/P3, SL P1/P2); **Exploration IA criteria** A–E names/max/descriptors |
| 4 | **History guide — first assessment 2017** | Paper 1 source markbands + generic source mark allocations; Paper 2 & Paper 3 essay markbands; **IA (Historical Investigation) criteria** |
| 5 | **Economics guide — first assessment 2022** | Paper 1/2/3 markbands; HL Paper 3 quantitative mark treatment; **IA (Portfolio) commentary criteria** |
| 6 | **Psychology guide — confirm cycle** | Paper 1/2/3 structure (HL/SL); short-answer vs extended markbands; **IA (Experimental Study) criteria** |
| 7 | **Language B (Spanish B or French B) guide — first assessment 2020** | Paper 1 writing criteria; IO criteria; HL/SL differences; receptive (Paper 2) mark treatment |

### Tier 2 — Core module instruments (cross-subject)

| # | Document | I will extract |
|---|----------|----------------|
| 8 | **TOK guide — first assessment 2022** | **Essay** assessment instrument (bands + max); **Exhibition** assessment instrument (bands + max); confirm holistic vs A/B |
| 9 | **EE guide — first assessment 2018** | **Generic A–E criteria** (names/max/descriptors); **subject-specific EE criteria** for each in-scope subject (e.g. EE in History, EE in Biology) |

### Tier 3 — Points-paradigm calibration (official markschemes)

| # | Document | I will extract |
|---|----------|----------------|
| 10 | **Official markschemes** for recent series — Math AA (P1/P2/P3, HL & SL) | M/A mark conventions, ECF patterns, "accept" alternatives, AG constraints |
| 11 | **Official markschemes** — Biology & Physics 2025 series (or specimen) | MCQ keys; structured/data-response point conventions |
| 12 | **Official markschemes** — History Paper 1 source questions; Language B Paper 2 (receptive) | Source-question point allocations; receptive answer keys/accept-marking |

> If any subject's traffic is on a **different cycle** than assumed in §2.0, supply that cycle's
> guide instead and flag it — I will branch the catalog by `guide_version`.

---

## Part 5 — What I need from you (end of phase 1)

1. **Confirm the subject list** (Part 1) — finalize the 5–10 subjects, and for **Language B** tell
   me Spanish B or French B (or both). Confirm each subject's **cycle/first-assessment year**
   (Part 2.0), especially whether Sciences are on the **2025** curriculum.
2. **Approve the architecture** (Part 3) — the per-component `assessment_model` catalog, the
   licensed-document store (§3.5), the added Level+Component selection axes (§3.3), and the plan to
   de-gate criteria/markband presentation (§3.4). Flag anything you want changed before phase 2.
3. **Start supplying the manifest documents** (Part 4) — Tier 1 first (subject guides, biggest
   yield), then Tier 2 (TOK/EE), then Tier 3 (markschemes). I will transcribe each into the catalog
   with provenance and build the marking routing on top.

*No marking logic was changed in this pass.*
