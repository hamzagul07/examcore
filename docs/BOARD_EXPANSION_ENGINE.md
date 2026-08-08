# Board Expansion Engine

**Status:** E0–E2 + E3 graph v1 + analytics + E4 OxfordAQA shell shipped; Physics/Chem marking next per product override  
**Audience:** Codex / Claude implementing multi-board  
**North star:** Boards are acquisition surfaces; marking is the product.

---

## Project framing (give this to the agent)

> Transform MarkScheme's current CAIE/IB architecture into a **board-agnostic examination platform**, then prove that architecture by adding **Edexcel International** as the first new adapter — **without degrading** existing CAIE/IB routes, SEO, marking, or conversions.

Do **not** frame the work as “add Edexcel content.”  
Frame it as: **ExamSystem adapters + shared educational graph + Board Expansion Engine**, proven by Edexcel IAL.

---

## Principles

1. **Boards acquire. Marking converts.** Expansion that only grows a revision-content site has failed.
2. **Adapters, not skins.** Differences go deeper than branding (papers, AOs, mark dialects, grade models). Design for AP before AP ships.
3. **Shared educational graph + pluggable assessment systems.** Reuse via mappings, not duplicated lessons.
4. **One subscription.** Board is onboarding + SEO + marking dialect. Billing stays usage-tiered across all boards.
5. **Gates before geography.** UK and AP earn engineering allocation; they are not assumed next steps.
6. **Do not rewrite CAIE.** Refactor only until CAIE is one adapter among equals.

---

## Domain model target

### ExamSystem adapter

Each qualification exposes roughly:

```ts
ExamSystem {
  board                 // 'caie' | 'ib' | 'edexcel' | 'oxfordaqa' | 'aqa' | 'ap' | …
  qualification         // 'ial' | 'igcse' | 'a-level' | 'diploma' | 'ap-course' | …
  subjects
  syllabusStructure     // topics / units / modules
  assessmentStructure   // papers, IA, FRQ, MCQ, …
  paperStructure
  commandWords
  gradeModel            // raw / UMS / levels / 1–5 / markbands
  markingDialect        // method marks | criteria | earned-point | …
  boundaries
}
```

```
CAIE       → adapter
IB         → adapter
Edexcel IAL→ adapter
OxfordAQA  → adapter
AQA        → adapter
AP         → adapter
```

### Liberated curriculum graph

Move internal thinking from `CaieSubject / CaieTopic / CaieLesson` toward:

```
Qualification
Subject
CurriculumNode          // canonical concept
AssessmentUnit          // paper / unit / FRQ set
ExamPaper
Question
MarkingRule
```

Mappings (not forks):

```
CurriculumNode  (e.g. Projectile Motion)
  ├── CAIE Physics 9702 → Topic 3.x
  ├── Edexcel IAL Physics → Mechanics → projectile motion
  ├── OxfordAQA → …
  ├── AQA → …
  └── AP Physics → Unit / competency
```

Each edge may carry: exam terminology, question patterns, command words, marking rules, misconceptions, AOs, past-paper refs.

**Reuse target:** ~70–85% shared lesson spine; board-specific edges hold the remainder.

Second moat (later): *we understand how curricula correspond* — gap maps, “94% overlap + 3 Edexcel differences,” dynamic IB vs A-Level comparisons.

---

## Board Expansion Engine (config → surfaces)

Adding a board should converge on **configuration + content ingestion**, not a product rewrite:

```yaml
board: pearson-edexcel
qualification: ial
subjects:
  - code: WMA   # confirm live codes at ingest time
    name: Mathematics
    units: [WMA11, WMA12, WMA13, WMA14]
grading:
  type: ums
assessment:
  style: modular
marking:
  dialect: edexcel
```

Generated (illustrative) routes:

```
/edexcel
/edexcel/international-a-level
/edexcel/international-a-level/mathematics
/edexcel/international-a-level/mathematics/past-papers
/edexcel/international-a-level/mathematics/grade-boundaries
/edexcel/international-a-level/mathematics/pure-1
/edexcel/.../flashcards | faq | quiz | questions | mistakes
```

Liberate the existing CAIE surface graph (`flashcards | faq | quiz | questions | mistakes`) from CAIE-only helpers (`lib/seo/caie-graph.ts`) into board-agnostic sitemap + metadata generation driven by adapters.

**Success test for the engine:** OxfordAQA (Phase E4) is mostly config + mappings + dialect + QA — not months of bespoke routing.

---

## Funnel (revised)

### Meter what students understand

Prefer psychologically clear limits over a raw “5 marks” counter that can mean one tiny part-question:

| Free | Pro+ |
|------|------|
| ~3 marked **answers**/day **or** 1 complete paper/week | Large / unlimited marking allowance |
| Basic feedback | Whole-paper, examiner reasoning, weakness history, predicted grade, revision recommendations, mistake memory |

Conversion story:

> MarkScheme now understands your exam performance; continued diagnosis requires Pro.

Not only: “you ran out of AI.”

Align with `docs/GROWTH_PLAN_2026H2.md` quota fixes (guest vs free inversion) before or alongside E2 measurement — otherwise board experiments measure a broken ladder.

### Question-native acquisition loop (critical)

Every indexed question page should support:

```
SERP → /questions/[slug] → Attempt (type / photo)
  → Marked in context → Try another → Account
  → Performance profile → Pro
```

`/mark` remains the generic entry. **Question context already present** removes a major funnel step. Multi-board expansion must treat `/questions/[slug]` + `/markscheme/[slug]` as first-class conversion surfaces, not SEO-only.

---

## Subject wedges

### Edexcel International (first proof)

| Wave | Subjects | Why |
|------|----------|-----|
| **1** | Mathematics, Physics, Chemistry | Equivalence, method steps, SF, units, dependent marks — best automated marking fit |
| **1.5** | Biology | Phrase / semantic MS matching; exposes model weaknesses earlier |
| **2** | Economics, Business | After STEM marking converts |

Shell may list Biology early for SEO; **marking experiment** is Wave 1 STEM first.

### UK (only after gates)

Not full GCSE catalogues. Start:

- AQA A-Level Mathematics, Physics  
- Edexcel A-Level Mathematics, Physics  

GCSE only after observed search demand — otherwise MarkScheme becomes a content company (AQA/Edexcel/OCR/Eduqas × many subjects).

### AP (own lifecycle — do not force Results Day)

AP adapter surfaces, not `/results-2026/ap` clones:

```
/ap
/ap/exam-dates
/ap/score-calculator
/ap/calculus-ab/score-calculator
/ap/physics-1/frq
/ap/physics-1/scoring
/ap/scores
```

Lifecycle: course selection → year → May exams → score release → credit/placement.  
Reuse: accounts, billing, OCR, handwriting, feedback engine, concept/weakness graphs, practice engine.  
New: FRQ, scoring guidelines, earned/not-earned points, 1–5 projection, AP analytics.

Edexcel *may* get `/results-2026/edexcel`-style seasonals; AP must not inherit that architecture mechanically.

---

## Phased build sequence

### Phase E0 — Board-native platform (before new content)

- Generalize CAIE-specific domain models enough that CAIE is one `ExamSystem` implementation  
- `ExamSystem` / `Qualification` abstraction  
- Board-aware `/mark` + profile board  
- Board-aware analytics, sitemap, SEO metadata  
- **Do not rewrite CAIE routes or break IB**  
- Keep `resolveBoard` evolution backward-compatible (`lib/courses/board.ts` today is `'cambridge' | 'ib'`)

### Phase E1 — Edexcel International shell

Ship acquisition surfaces even before full marking:

- `/edexcel`, `/edexcel/international-gcse`, `/edexcel/international-a-level`  
- IAL hubs: Mathematics, Physics, Chemistry, Biology  
- Subject / unit hubs, grade boundaries, past-paper indexes  
- Topic graph + FAQ + mistakes + comparison pages  

### Phase E2 — Edexcel Maths marking (the experiment)

Prove conversion, not page count:

- Typed + photographed answers  
- Method working, equivalent expressions, units, accuracy, dependent + final-answer marks  

**Measure funnel:**

```
SERP → question → attempt → mark → signup → second mark → free cap → upgrade
```

These numbers decide whether to continue.

### Phase E3 — Cross-board curriculum graph

Tables / concepts (names indicative):

- `canonical_concepts`  
- `curriculum_nodes`  
- `curriculum_edges`  
- `board_topic_mappings`  
- `assessment_mappings`  

Connect CAIE ↔ Edexcel; Physics/Chemistry next.

### Phase E4 — OxfordAQA

Architecture validation. If this takes a full product rebuild, E0 failed.

Expected shape: config → ingest specs → mappings → assessments → marking dialect → QA → launch.

### Phase E5 — Selective UK

AQA + Edexcel A-Level Maths/Physics only. GCSE later, demand-led.

### Phase E6 — AP assessment adapter

New dialect + surfaces; shared platform underneath.

---

## Expansion gates (Edexcel Int → UK)

Do **not** open UK until roughly:

| Gate | Threshold (tune to traffic) |
|------|-----------------------------|
| Demand | ≥ **10,000** non-CAIE organic sessions/month **OR** ≥ **1,000** Edexcel marking attempts/month |
| Mark → account | Edexcel within **~20%** of CAIE |
| Free → paid | Edexcel within **~25–30%** of CAIE |

TAM slides do not allocate eng. Conversion does.

---

## North-star metric

**Marked answers per organic visitor** — by board, subject, landing page type, country, query family.

Then: **Mark → Pro conversion by board.**

Example dashboard (illustrative):

| Board / subject | Organic | Marks | Mark rate | Paid |
|-----------------|---------|-------|-----------|------|
| CAIE Mathematics | 12,420 | 4,921 | 39.6% | 4.2% |
| IB Physics | 4,220 | 1,178 | 27.9% | 3.7% |
| Edexcel IAL Mathematics | 2,816 | 1,061 | 37.7% | 4.5% |
| OxfordAQA Physics | 713 | 192 | 26.9% | 3.1% |

Invest where mark rate and paid conversion hold. Kill vanity indexation.

---

## Sequence (confirmed)

```
E0 board-native platform
 → E1 Edexcel Int shell
 → E2 Edexcel Maths marking (prove)
 → E3 curriculum graph
 → E4 OxfordAQA (engine test)
 → E5 selective UK A-Level
 → E6 AP adapter
```

---

## Explicit non-goals (now)

- Full GCSE multi-board catalogues  
- Board-specific subscriptions  
- AP forced into A-Level results architecture  
- Enabling Edexcel/AQA in onboarding with empty marking packs  
- Parallel “skin” sites that fork lesson JSON per board  

---

## Agent constraints

1. Preserve all live `/caie/**`, `/ib/**`, legacy `/courses/**` canonical behaviour.  
2. Prefer adapter interfaces + config registries over `if (board === 'edexcel')` sprawl in page components.  
3. Question pages must remain markable in-context as boards are added.  
4. No copyrighted past-paper text verbatim; ingest patterns and original/licensed items only (existing copyright rules).  
5. Coordinate metering changes with growth-plan quota fix — do not ship E2 analytics on an inverted free/guest ladder without calling that out.  
6. Suggest `/codex:review` on E0 refactors that touch routing, SEO graph, or billing caps.

---

## First implementation slice

### Done (E0 foundation)

1. `lib/exam-systems/` — `ExamSystem` types, registry, CAIE/IB adapters, stubs for Edexcel/OxfordAQA/AQA/AP.  
2. `lib/courses/board.ts` resolves via registry; CAIE/IB outputs unchanged (see `board.test.ts` + `exam-systems.test.ts`).  
3. Lesson surfaces liberated to `lib/exam-systems/surfaces.ts`; CAIE aliases kept.  
4. `/mark` board picker + onboarding `BOARDS` driven by adapter metadata (future boards disabled).  
5. Path helpers in `lib/exam-systems/paths.ts` for upcoming shells.

### Still later

- Sitemap generation reading `listExamSystems()` for future prefixes (done for Edexcel shard)  
- Community `Board` union stays CAIE/IB until those boards have community support  
- See `docs/BOARD_CONVERSION_METRICS.md` for board analytics SQL (mark_runs.exam_system)  

### Done (E1 shell)

- `lib/edexcel/catalog.ts` — IAL Maths / Physics / Chemistry / Biology + unit codes  
- Routes under `/edexcel/**` (qual, subject, unit, past-papers, grade-boundaries)  
- Sitemap shard `edexcel`  
- Adapter `ownsSubjectCode` for `WMA11`-style units (no IB steal)

### Done (E2 Maths marking)

- `/mark` board picker includes Pearson Edexcel (practice + scanned script only)
- Wave 1 units: WMA/WME/WST from `lib/edexcel/marking.ts`
- Prompt + derive/verify/rewrite board label = `Edexcel`
- Kill-switch: `NEXT_PUBLIC_EDEXCEL_MARKING_ENABLED=0`
- Onboarding `Edexcel` stays `enabled: false` until free→paid conversion is proven

### Done (E4 OxfordAQA shell)

- `lib/oxfordaqa/catalog.ts` + `/oxfordaqa/**` routes (config → surfaces)
- Adapter owns `oxaqa-*` codes; **markingEnabled: false**
- Sitemap shard `oxfordaqa`
- Engine test: new board ≈ catalog + graph + pages, not a rewrite

### Done (discovery)

- Nav / footer / `?board=` / `/results-2026/edexcel`
- Blog: `edexcel-ial-vs-cambridge-a-level-2026` + CTAs on board-choice posts
- `mark_runs.exam_system` migration applied in production

### Done (conversion plumbing)

- Shell CTAs keep `board=edexcel` (+ unit for Wave 1 Maths) via `edexcelMarkHref`
- Past-papers / boundaries no longer leak to bare `/mark` or CAIE as the primary CTA
- `/compare` + board-choice blog surface Edexcel IAL Maths mark deep links

### Done (mark → account)

- Edexcel onboarding enabled with Wave 1 Maths **units** as subjects (WMA/WME/WST)
- Adapter `enabled: true`; funnel board preselects Edexcel after `/mark?board=edexcel`
- Guest post-mark signup returns to `/mark?board=…&subject=…` (not bare `/mark`)
- Physics/Chem still not selectable in profile (no false marking promise)

### Done (acquisition bridges)

- Edexcel hub primary mark CTA; CAIE hub “On Edexcel?” bridge
- Blog CTAs / worked examples route Edexcel-named posts to `/mark?board=edexcel`
- Thin IAL Maths session map on past-papers + unit pages (metadata only; no PDF bank)
- UMS explainer + mark CTA on grade-boundaries hubs (tables still deferred)

### Done (E3 curriculum graph v1)

- `lib/curriculum-graph/` — content-first CAIE 9709 ↔ Edexcel WMA/WME/WST mappings
- Seed: `content/data/curriculum-graph/caie-9709-edexcel-wma.json` (all 9709 topic codes)
- UI: `CrossBoardTopicLinks` on CAIE 9709 lessons + Edexcel Maths subject/unit hubs
- Not yet: Supabase tables, science topic trees, lesson-JSON reuse

### Done (Wave 1 Physics/Chem marking + science SEO)

- `getEdexcelMarkableUnitCodes()` includes WPH/WCH; Biology still out
- Maths session map gated to WMA/WME/WST only
- Science examiner line in point-based prompts; picker/onboarding copy updated
- SEO: WPH11 + Physics past-papers + Chemistry marking guides; OxfordAQA hub strip

### Next

- Measure Edexcel marks / `/edexcel` sessions weekly (`BOARD_CONVERSION_METRICS.md`)
- Full past-paper / scheme ingest only after conversion justifies it
- OxfordAQA marking still off; UK / AP still gated on demand
- Do not mix board work into unrelated branding/landing WIP on main
