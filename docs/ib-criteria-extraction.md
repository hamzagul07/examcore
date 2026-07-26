# Extracting IB criteria from subject guides

Status: tooling built and validated; **no data inserted**
Script: `scripts/extract-ib-criteria.mjs`
Related: `docs/criterion-ladder.md`

## Why

Film, Music, Theatre and Dance — 84 lessons, the largest remaining
zero-coverage block — have no rows in `ib_criterion`. The criterion ladder can
only cover a subject whose criteria are loaded.

## Two blockers found, in order of severity

### 1. Three of the four guides on disk are the wrong edition

`IB SUBJECT GUIDES/Group 6 - The Arts/` holds:

| Guide on disk | Course targets (`syllabusYear`) | Usable? |
|---|---|---|
| Film **2019** | 2019 structure — textual analysis, comparative study, film portfolio, collaborative project | **yes** |
| Music **2011** | 2020 guide — "exploring music in context, experimenting, presenting" | no |
| Theatre **2017** | 2022 structure | no |
| Dance **2013** | current structure | no |

The course content for all four was authored against `syllabusYear: 2022`. Only
Film's guide matches what we teach. Ingesting the other three would publish
rubrics that contradict our own lessons — a wrong rubric in front of a student is
worse than no rubric.

**Music, Theatre and Dance are blocked on sourcing the current guides.** That is
a data-acquisition task, not an engineering one.

### 2. Table columns linearize, so descriptors cannot be verified verbatim

For Film, extraction mostly works — 3 components, 36 of 37 bands verified
against the source text:

| Component | Marks | Criteria | Reconciles |
|---|---|---|---|
| `textual_analysis` | 24 | A 6, B 12, C 6 | 24 ✓ |
| `comparative_study` | 32 | A 12, B 12, C 8 | 32 ✓ |
| `film_portfolio` | 30 | A 4, B 6 (×3 roles) | 30 ✓ |

The one failure is the important one. In the printed guide each band row has a
descriptor cell **and** a "possible characteristics" keyword cell. `pdfjs`
linearizes the table, so the raw text reads:

```
This work is good . Clear
```

— the mark, then the keyword column — while the descriptor sentence appears
elsewhere in the stream. The model reassembled the descriptor correctly-looking
prose from separated cells, but the fidelity gate cannot confirm it is verbatim,
because that sequence does not exist contiguously in the source.

That is the gate working as intended. For content whose entire value is
fidelity — and where this repo's own rule is "stored verbatim, never
condensed" — "probably right" is not good enough to insert.

**Fixing this needs layout-aware extraction** (cell coordinates via
`getTextContent().items[].transform`, or rendering the criteria pages and using
vision) so descriptor cells are read as cells rather than as a text stream.

### Also: the HL component was not captured

The Film HL collaborative project criteria live around pages 78–82. Running the
extractor on a narrow page range produced a malformed component
(`film_reel`, null letter, null max marks) — too little surrounding context.
It needs the wider range plus the layout fix above.

## The tooling

`scripts/extract-ib-criteria.mjs <guide.pdf> <subject-code> <out.json> [first] [last]`

- Writes JSON for review. **Never touches the database.** Applying is a separate,
  deliberate step.
- Prompt forbids paraphrase, summarising, merging, and inventing.
- Every extracted descriptor is checked back against the source text; the report
  carries `bandsChecked`, `bandsNotFoundVerbatim` and the `suspect` list.
- The checker normalises PDF artifacts (space before punctuation, curly quotes)
  on both sides, so it flags real mismatches rather than typography.

## If Film is worth finishing

The payoff is 21 lessons (Film HL 10 + SL 11), and the lessons map cleanly —
their `paper` values are exactly the four component names. Order of work:

1. Layout-aware cell extraction for the criteria tables.
2. Re-run over pages 50–84 and confirm `bandsNotFoundVerbatim === 0`.
3. Add `ib-film` to `ib_subject`, insert components/criteria/bands with
   `source_document_id` provenance.
4. Add `'ib-film': 'ib-film'` to `SUBJECT_CODE` in `lib/courses/criterion-ladder.ts`
   and a `componentKeyFor` branch for the four component names.
