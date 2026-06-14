# STEM Lesson Quality Standard

Authoritative guide for Cambridge International A-Level STEM course lessons (9709, 9231, 9702, 9700, 9701, 9618).

Gold standard reference: `content/courses/9702/22-2-photoelectric-effect.json`

---

## Content tiers

| Tier | `status` | Minimum bar | Student experience |
|------|----------|-------------|-------------------|
| **Outline** | `outline` | Syllabus point + `/mark` CTA | Honest placeholder — not full teaching |
| **Pilot** | `pilot` | Passes `validateGeneratedLesson` gates | Full teaching stack, generator-validated |
| **Premium** | `premium` | Pilot + editorial review + curated visuals | Best-in-class (photoelectric level) |

**Rule:** Never mark a 3-section stub as `premium`. Stubs are `outline` until upgraded.

---

## Teaching stack (research-backed)

Each pilot-grade lesson follows this sequence:

1. **Hook** — `simpleExplanation` with title, summary, **analogy** (abstract topics), 4 exam-focused steps
2. **Core notes** — alternating `heading` / `text` / `formula` / `keyPoints` (≥3 heading groups, ≥2 sentences each)
3. **One visual** — step-synced `interactiveEmbed` OR `diagramSpec` OR `diagram` (never stack hero + carousel + concept map)
4. **Worked examples** — ≥2 `workedExample` sections; generator output must include `sourceQuestionId` from Supabase evidence
5. **Misconceptions** — `keyPoints` targeting common errors (e.g. intensity vs frequency in photoelectric)
6. **Exam tip** — command-word and unit reminders
7. **Retrieval** — 8–12 `flashcards`, optional `quickCheck` (MCQ for P1), 2–4 `faq` items
8. **Practice** — `practice` section linking to `/mark?subject={code}&topic={topicCode}`

### Research anchors

- **Worked-example effect** (Sweller): show 2–3 traced solutions before independent practice
- **Dual coding** (Paivio): one visual synced to explanation steps, not decorative clutter
- **Retrieval practice**: flashcards + quickCheck at end, not only at start
- **Concrete-before-abstract**: analogy in `simpleExplanation` before formal definitions
- **Misconception-first keyPoints**: name the wrong intuition, then correct it

---

## Photoelectric annotated breakdown

File: `content/courses/9702/22-2-photoelectric-effect.json`

| Element | What it does | Copy for other topics |
|---------|--------------|----------------------|
| `simpleExplanation.analogy` | Vending-machine metaphor before equations | Required for abstract physics/chem |
| `simpleExplanation.steps` (4) | Step carousel sync target | Match diagram/embed step count |
| `flashcards` (11) | Retrieval — definitions + traps | Minimum 8 |
| `heading`/`text` pairs | Progressive formalism | ≥3 groups with substance |
| `formula` sections | Planck + Einstein + eV conversion | One formula block per key relationship |
| `keyPoints` | Intensity vs frequency distinction | Misconception bullets |
| `workedExample` | Full calculation with unit conversion | ≥2 for pilot; show working |
| `examTip` | eV ↔ J reminder | Paper-specific gotcha |
| `faq` (3) | Threshold vs work function | Address top student questions |
| Single `diagram` | One hero visual | No generic TopicDiagram fallback |

---

## Section type recipes

### intro
One paragraph: why the topic matters + paper context. No "read these resources".

### heading + text
Every `heading` must be followed by `text`, `formula`, or `keyPoints` with ≥2 sentences.

### formula
KaTeX in JSON strings. Include variable definitions below the equation.

### keyPoints
3–6 bullets. At least one must address a common misconception.

### workedExample
```json
{
  "type": "workedExample",
  "question": "...",
  "solution": "Numbered steps with units.",
  "sourceQuestionId": "uuid-from-supabase"
}
```

### practice
Always link to `/mark?subject={code}&topic={topicCode}`.

---

## Subject playbooks

### Mathematics (9709) / Further Maths (9231)
- GeoGebra embeds for graphs, transformations, vectors, integration
- Step-sync slider params (`n`, `x₀`, `a`, `b`) in `diagram-specs.ts`
- P1: `quickCheck` with 4 options, MCQ-style worked examples
- Show method before answer; state domain restrictions

### Physics (9702)
- PhET HTML5 where catalog exists
- Derive then apply formulas; graph-reading in worked examples
- Paper 3: uncertainty, SF, gradient vocabulary

### Chemistry (9701)
- Mechanism teaching: stepwise curly-arrow logic in `text` sections
- Organic naming: structure ↔ name both directions in worked examples
- PhET for gas laws / states; custom diagrams for bonding, cells, orbitals
- Cornerstone order: 2.x → 3.x → 5.x → 6.x → 7.x → 8.x → 13–14.x

### Biology (9700)
- Process flows (photosynthesis, respiration, action potential): one step-sync diagram
- `comparisonTable` for cell types, transport, immunity
- Link structure to function in every heading group

### Computer Science (9618)
- Trace tables and pseudocode in worked examples
- Logic gates / FDE cycle: custom diagram families
- Line-by-line algorithm traces for recursion and sorting

---

## Visual discipline

1. **At most one primary interactive surface** per lesson (embed OR diagram OR diagramSpec)
2. Catalog lookup via `attachCatalogVisuals()` — only when `simpleExplanation.steps` exist
3. Diagram `steps[]` length must equal explanation step count
4. **No fallback pile-on** — omit visual rather than generic `TopicDiagram`
5. External references for catalog expansion: PhET, GeoGebra Materials, Desmos (do not scrape third-party notes)

---

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|--------------|--------------|-----|
| Stub marked `premium` | Misleading course index | Relabel to `outline` |
| intro + practice + resources only | Not teaching | Upgrade to pilot |
| "Read ZNotes / Save My Exams" | No value-add | Original explanations + past-paper examples |
| 4+ visuals on one page | Cognitive overload | One step-synced visual |
| Headings with no body text | Broken reading flow | Add text or remove heading |
| Invented past-paper questions | Untraceable | Use Supabase `sourceQuestionId` |
| Generic TopicDiagram fallback | Not topic-specific | Omit or add catalog entry |

---

## Validation gates

Enforced in `lib/courses/generator/validate-lesson.ts`:

- ≥2 `workedExample` sections with valid `sourceQuestionId`
- ≥8 flashcards
- `simpleExplanation.analogy` present (STEM abstract subjects)
- ≥3 `heading` sections each followed by substantive content
- ≤1 of `interactiveEmbed` / `diagramSpec` / `diagram`
- `coverageScore` ≥ 0.8 on syllabus objectives
- KaTeX parseable throughout

---

## Upgrade pipeline

```
Supabase evidence → generate-lesson.ts → validate-lesson.ts → attach-lesson-visuals.ts → promote to flat JSON
```

Scripts:
- `scripts/generate-pilot-lessons.mjs` — batch generation
- `scripts/promote-pilot-lesson.mjs` — `.pilot.json` → flat `{slug}.json`
- `scripts/stem-lesson-audit.mjs` — richness report per subject
- `scripts/relabel-stem-stubs.mjs` — premium stubs → outline

Tests after each batch:
```bash
pnpm exec tsx lib/courses/interactive-embed-urls.test.ts
pnpm exec tsx lib/courses/diagram-specs.test.ts
pnpm exec tsx lib/courses/generator/validate-lesson.test.ts
```
