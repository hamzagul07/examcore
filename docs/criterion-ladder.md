# Criterion ladder — the picture for the arts and languages

Status: implemented
Related: `docs/humanities-diagram-families.md`

## Why this instead of another diagram family

After the essay-map and causation families, 18 subjects were still at 0% and
almost all of them were **the arts and the languages** — Film, Music, Theatre,
Dance, Visual Arts, French B, Spanish B. No drawn family fits a Dance lesson.

For those subjects the criteria *are* the syllabus. A Visual Arts
process-portfolio lesson is not about a diagram-able object; it is about what
the four criteria reward. So the picture is the rubric.

## What the criteria data actually covers

`ib_criterion` / `ib_criterion_band` hold **201 criteria and 881 bands** across
17 subjects, verbatim from the guides. (An earlier note in this repo said these
tables were empty — that was `list_tables` reporting stale `reltuples`
estimates, not real counts.)

Against the zero-coverage cluster:

| Cluster | Lessons | Criteria loaded? |
|---|---|---|
| Visual Arts | 13 | yes — 24 criteria, 99 bands |
| French B + Spanish B | 38 | yes — via `ib-language-b`, 14 criteria |
| English A Lang-Lit | 21 | yes — `ib-lang-a-langlit`, 16 criteria |
| **Film, Music, Theatre, Dance** | **84** | **no rows at all** |

So this closes part of the gap, not the whole thing. Film/Music/Theatre/Dance
need the criteria ingested before anything can be built for them — and we will
not paraphrase IB descriptors to fill the hole.

## Mapping

`lib/courses/criterion-ladder.ts` — pure, because the lesson → component mapping
is the part that silently goes wrong.

A lesson's `paper` field maps to a `component_key`: Visual Arts
`"Process portfolio"` → `process_portfolio`, Language B `"P1"` → `paper_1`. Level
comes from the course folder slug (`-hl` / `-sl`).

Visual Arts splits two components by level in the key itself
(`comparative_study_hl` / `_sl`) while others do not, so `candidateComponentKeys`
tries the level-specific key **first** — otherwise an HL student gets the SL
rubric, which has different max marks.

Subjects with no criteria return `null` rather than a guess.

### Validated against the real data

Across the four mappable subject families: **85 lessons, 83 resolved to a
component, 63 have criteria.**

The 20 that resolve but have none are all Language B **Paper 2** — *"Receptive
skills: listening and reading"* — which is objectively marked and genuinely has
no criteria. Correct behaviour, not a gap.

## Licensing — why there are no descriptors here

**The first version of this shipped verbatim IB band descriptors onto 85 public,
sitemapped lesson pages. That was wrong and is fixed.**

`app/api/ib/catalog/route.ts` already sets this codebase's policy in its own
docstring: public surfaces carry *"only non-sensitive metadata (codes, labels,
level, model, max_marks) — NOT the verbatim licensed descriptors/prose."*
Course lesson pages are public, prerendered and in the sitemap, so they fall
squarely under that rule, and the ladder contradicted it.

The descriptors remain in `ib_criterion_band` and remain available to the
**marking pipeline**, which is where they were licensed to be used. They are no
longer selected on the lesson path at all — not fetched, not passed as props, not
present in the RSC payload.

`CriterionBand` deliberately carries only `marksMin`/`marksMax`, and a unit test
asserts the type has no third field, so a future edit cannot quietly put the
prose back on an indexed page.

## Rendering

`components/courses/CriterionLadder.tsx`, section "How it's marked".

What survives is the part a student planning work actually needs: **which
criteria exist and which are worth the most** — each with a weighting bar, its
percentage share, and how many bands it is split into. For "the full descriptors,
see your subject guide".

## Failure behaviour

`getCriterionLadder` is wrapped in `cache()` (one query per component per render
pass, not per page) and returns `null` on any error. Course pages are prerendered
and must not fail to build over an optional enrichment.

## Verified

- **Visual Arts SL** `1-1-visual-arts-inquiry-and-investigation`: 5 criteria,
  "Part 2: Process portfolio · 34 marks", criterion A "Skills, techniques and
  processes" — 12 marks, 35% of the total, 5 bands (0–12).
- **French B HL** `1-1-identities-…`: 3 criteria, and correctly picks the **HL**
  variant — "Paper 1 — Productive skills: writing (HL) · 30 marks".
- **Biology HL**: no ladder, no TOC entry. Correctly absent.
- **No descriptor leakage**: four verbatim phrases that the first version did
  render were checked against both `document.body.innerText` and the raw HTML
  payload on Visual Arts and French B — zero hits on either.
- Production build passes (exit 0); no literal escape sequences left on the page.
