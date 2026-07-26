# Humanities diagram families

Status: 2 of 5 shipped (essay argument map, history causation)
Related: `docs/course-step-sync.md`, `lib/courses/diagram-families.ts`

## Why the existing approach stalled

The "map, don't draw" strategy worked for STEM and then hit a wall, because
**every family in the registry draws a physical or mathematical object** —
`FreeBodyDiagram`, `EnzymeActionDiagram`, `MoleculeShapeDiagram`. Nothing in it
fits "Evaluate the causes of the Cuban Missile Crisis". 28 IB subjects sat at
exactly 0%, and they were the humanities, arts and languages.

## The reframe

For an essay subject the picture is not the content — it is **the structure the
mark scheme rewards**. That structure is shared across subjects, so one family
covers six of them.

---

## Shipped 1: `essay-argument-map`

`components/diagrams/EssayArgumentMapDiagram.tsx` — thesis → evidence →
counter-claim → evaluation, in four cumulative steps.

The step order is the argument: students reliably produce thesis + evidence, and
the marks they leave behind are in engaging with the opposing reading and
committing to a judgement. Those two are revealed last, and the closing line says
so outright — *"the top band is earned here, not in the amount of evidence."*

Wording is deliberately subject-neutral ("evidence", never "quotation" or
"source"), because the same skeleton is assessed in English A, History, Global
Politics, TOK and the Extended Essay.

**17 lessons mapped across 6 subjects.** Only lessons explicitly *about building
the argument*; content topics ("The Cold War", "Human rights frameworks") are
left uncovered, because the skeleton is not the picture behind them.

| Subject | Lessons |
|---|---|
| History HL/SL | paper-1 structured essay, paper-3 essay skills, paper-3 historiography |
| English A Literature HL/SL | comparative essay structure, HL essay line of inquiry, HL essay argument, critical line of inquiry |
| English A Lang-Lit HL | HL essay line of inquiry, HL essay argument |
| Global Politics HL/SL | writing the Global Politics essay |
| Digital Society HL/SL | paper-2 extended response |
| Extended Essay | structure and academic writing, criterion C critical thinking |
| TOK | essay argument and evidence, essay perspectives and implications |

Preview: `/dev/essay-argument`.

## Shipped 2: `hist-causation`

`components/diagrams/HistoryCausationDiagram.tsx` — long-term causes → immediate
trigger → the event → short-term, long-term and contested consequences, closing
on the weighting judgement.

Built as **causation, not a timeline**, because causation is the frame these
lessons name in their own objectives: *"long-term, short-term and immediate
causes"*, *"origins, development and impact"*, *"emergence, consolidation"*. A
timeline with no dates would have been decoration.

Two exam traps are drawn rather than described: the trigger is separated from the
causes (mistaking the spark for the cause is the classic mid-band error), and the
final layer is the weighting judgement — *"listing causes is one band, ranking
them is the next."*

**16 lessons** across History HL and SL. HL and SL renumber the same topics
(HL `2-11` is SL `2-7`), so both slug sets are mapped. Descriptive period topics
— Society and economy 750–1400, Societies in transition, Dynasties and rulers —
are deliberately left uncovered; a causation frame is not the picture behind a
survey topic.

Preview: `/dev/history-causation`.

---

## Two checks to repeat for every future humanities family

### 1. Slug collisions

`SLUG_FAMILY` is keyed by slug **without the subject**, so a generic slug like
`1-3-structure-and-academic-writing` would silently attach a diagram to any other
subject using the same slug. All 33 mappings were verified to resolve only within
their intended subject (HL/SL pairs of the same subject are the intended case).

Humanities slugs are far more generic than STEM ones
(`8-2-effect-of-temperature-on-reaction-rates-…`) and collide much more easily.

### 2. Which route a subject is actually served on

**Corrected finding.** An earlier version of this doc claimed 8 subjects were
"unreachable" with 81 lessons of dead content. That was wrong, and the way it
went wrong is worth recording.

IB courses are served on **two** routes:

| Route | Guards on | Used by |
|---|---|---|
| `/ib/courses/<slug>/<lesson>` | `getIbSubject()` + `getIbCourseLessons()` — reads the content dir directly | **canonical**; the sitemap and every internal link |
| `/courses/ib-<subject>/<lesson>` | `getCourseSubject()`, which needs a syllabus tree | legacy alias; nothing links to it |

All 52 IB subjects have always resolved on the canonical route and have always
been in the sitemap. Only the alias 404'd for 8 of them.

**How the wrong conclusion happened:** the claim rested on HTTP 404s from a dev
server. A cold-started Next dev server returns 404 for course routes until it
warms up, and a hot one keeps serving reverted modules — so it 404s pages that
work and serves pages whose code you just removed. It is not a valid oracle for
route existence. Check the library layer (`getIbCourseSlugs()`,
`getCourseSubject()`) instead, which is deterministic.

### 3. Syllabus registration — the real gap, and it is not routing

Commit `09f57e95` added 4 IB subjects (8 HL/SL variants): catalog entries,
syllabus JSON, and full course lessons — but never touched
`lib/syllabi/ib-syllabi.ts`, which registers them in the syllabus registry.
The JSON files were sitting on disk, unimported.

That does not break pages. It breaks the features gated on `hasSyllabusTree()`:

- `lib/courses/review-queue.ts:115` — spaced review **skips** subjects with no tree
- `lib/syllabi/attempts.ts:56` — attempt topic-tagging **skips** them
- `lib/mastery.ts:196` — mastery tracking has no tree to compute against

So students taking Global Politics, Digital Society, Design Technology or SEHS
could read the courses and get marked, but got **no mastery tracking and no
spaced review**. Fixed by registering the 8 files (8 imports + 8 map entries);
all four now return a full tree. Topic codes were verified 1:1 against lesson
`topicCode`s across all 8 — zero mismatches.

**Not a bug on indexed pages.** The `"Revise X for Cambridge ib-history-hl"` h1
appears only on the legacy `/courses/ib-*` alias, which has zero sitemap entries.
The canonical route has its own correct builder (`lib/seo/ib-course-seo.ts`):
*"Revise X for IB History (2.11)"*, markbands, and an FAQ that explicitly states
IB does not use B1/M1/A1. Worth fixing for tidiness one day; not an SEO issue.

---

## Result

All 1,859 lessons are reachable (they always were, on the canonical route), so
the raw and "reachable" counts are the same number:

| | Before | After both families |
|---|---|---|
| Catalogue with a visual | 1,220 / 1,859 (66%) | **1,253 / 1,859 (67%)** |
| Subjects at 0% | 28 | **18** |
| Lessons in a 0% subject | 298 | **186** |

**33 lessons gained** — 17 from the essay map, 16 from causation. The Global
Politics and Digital Society mappings are live (they render; verified in a
browser), so they count.

Moved off zero: History HL/SL, English A Literature HL/SL, English A Lang-Lit HL,
Global Politics HL/SL, Digital Society HL/SL, Extended Essay. TOK 40% → 53%.

## What remains at 0% is no longer the humanities

The 18 remaining zero-coverage subjects are almost entirely **the arts and the
languages** (Design Technology HL/SL joins the list — it was always at 0%, just
not previously counted):

Visual Arts SL (13), Film HL/SL (21), Music HL/SL (21), Theatre HL/SL (22),
Dance HL/SL (20), French B HL/SL (19), Spanish B HL/SL (19), CAS (10), plus
Design Technology HL/SL (19), Computer Science SL (11) and English A Lang-Lit SL
(11, which has no essay-skills lesson to map).

None of the five proposed families fits a Dance or a Spanish B lesson. That
cluster needs a genuinely different idea, not another variation on these.

## Still to build (3 of 5)

1. **Stakeholder / actor map** — Global Politics, Business, ESS.
   **Checked: `StakeholderDiagram` does NOT generalise.** It is a Mendelow
   power/interest 2×2 — a business planning tool, not an actor-relations map. A
   new component is needed.
2. **Annotated exemplar** — a model paragraph where each sentence shows which
   criterion it earns. Highest value and highest effort; unique to us because the
   IB descriptors are stored verbatim.
3. **Criterion ladder** — reuse the marking band ladder as a *learning* visual.

Global Politics is now fully wired (pages, syllabus tree, essay-map diagram), so
the stakeholder map has a live target.
