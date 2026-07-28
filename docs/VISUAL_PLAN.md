# MarkScheme — Course Visualisation Plan

Written 2026-07-28. Every number below was measured from the repo on that date,
not estimated. Re-run the coverage script in §7 to refresh.

---

## 1. Where we actually are

| Metric | Value |
|---|---|
| Lessons | 1,859 |
| Lessons with *any* visual | 1,253 (67%) |
| Bespoke SVG diagram components | 197 |
| …median size | **42 lines** (84 are under 40) |
| …that honour `stepIndex` | 159 |
| …that honour `params` | 17 |
| Hand-built interactive explorables | 19 (**1% of lessons**) |
| Subjects at 0% coverage | ~20 (arts, languages, TOK/EE, CS SL, design tech, CAS) |
| Scraped third-party PNGs | 304 (191 MB, `public/courses/diagrams/`) |

**The problem is fidelity, not quantity.** A 42-line SVG is a placard, not an
explanation. The pre-rebuild photosynthesis diagram was an ellipse, two arrows
and the balanced equation — a student who does not already understand
photosynthesis learns nothing from it.

**Motion is absent.** No `framer-motion`, no Lottie, no Rive anywhere in
`components/diagrams/`. The only motion was a 0.3 s opacity fade between steps.

---

## 2. Two structural blockers found and fixed

**The theme layer forbade semantic colour.** Rules in
`lib/design-system/ec-theme-contrast.css` and `margin-notes-contrast.css` set
`.lesson-diagram-svg [stroke] { stroke: <one themed colour> }`. CSS beats SVG
presentation attributes, so *every* diagram was forcibly monochrome — a path
with `stroke="#ff0000"` computed to brand green. Fixed by adding
`:not(.dgm-hue)` to those four rules.

> **Convention:** any element whose colour carries meaning must carry
> `className="dgm-hue"`, and must use a mid-tone accent legible on both the zen
> paper and late-night surfaces. Everything else keeps the existing contrast
> treatment.

**`app/(marketing)/courses/course-premium.css` has no importer.** ~3,400 lines,
including the `.lesson-diagram-svg` base styles and the `eq-anim-*` keyframes.
Editing it has no effect. Shared diagram CSS now lives in `lib/design-system/`
with an `@import` in `app/globals.css`. *Open question: what else in that file
is dead?*

---

## 3. What now exists

### Motion primitives — `lib/design-system/diagram-motion.css`

| Class | Use |
|---|---|
| `dgm-flow` | Marching dashes — electron transport, mass flow, cycle direction |
| `dgm-draw` | Path draws itself in (set `--dgm-draw-length`) |
| `dgm-pulse` | Breathing emphasis — an input, product, or active site |
| `dgm-travel` | Particle riding a path (needs `offset-path`) |
| `dgm-spin` | Rotating machinery — ATP synthase, rotors |
| `dgm-delay-1..3` | Stagger |
| `.lesson-diagram-scroll` / `--dense` | Dense figures scroll instead of shrinking on mobile |

All are no-ops under `prefers-reduced-motion`. Apply motion **only to the layer
the active step focuses** — otherwise it reads as decoration, not explanation.

### Data-authored figures — `lib/courses/figures.ts`

Bespoke SVG is right when a topic needs an accurate hand-composed drawing. It is
wrong for the long tail. Four kinds, each a small grammar an LLM emits reliably
and `validateFigure` can reject before a student sees it:

| Kind | Renderer | Fixes |
|---|---|---|
| `mermaid` | mermaid | History timelines, TOK argument maps, org charts, CS flows |
| `chart` | Vega-Lite | Economics, geography, statistics |
| `molecule` | smiles-drawer | Organic chemistry from a SMILES string |
| `notation` | abcjs | IB Music — engraved **and playable** staves |

Authored as a top-level `figures[]` array on the lesson JSON, same pattern as
`comparisonTable`. Rendered by `components/courses/figures/LessonFigureBlock`,
which code-splits every renderer (`ssr: false`) so lessons without figures
download none of it. Preview at `/dev/figures`.

`validateFigure` rejects: unknown kinds, unsupported mermaid diagram types,
mermaid `click` directives, chart specs containing any remote `url`, empty or
implausible SMILES, and ABC without a `K:` line. Invalid figures are dropped and
logged, never thrown — one bad generated spec must not take down a lesson.

### Pilot — `components/diagrams/PhotosynthesisDiagram.tsx`

30 lines → four full-canvas scenes, one per walkthrough beat, selected by
`stepIndex`, with a corner locator so the student stays oriented as the scale
changes (organelle → pigment → membrane → stroma).

Two lessons from building it:

1. **One scene per step beats dimming layers** when the beats sit at different
   scales.
2. **Plot real data by sampling, not by hand-placing bezier controls.** Cubic
   controls overshoot: a curve drawn to "peak at 0.95" topped out near 0.5 and
   understated how strongly chlorophyll absorbs red and blue. See
   `spectrumPath`.

---

## 4. What to spend money on

**Do not buy an image-generation API.** Diffusion cannot draw correct labelled
science. In exam prep a pretty wrong diagram is worse than a plain right one —
the student memorises the error and loses the mark. The one exception is
*decorative* imagery (blog headers, subject hero art) where nothing is taught.

Ranked:

1. **Deepen the artwork on the spine that already exists.** No new
   infrastructure. Generate *code*, which is verifiable and diffable, not pixels.
   Highest understanding-per-pound available.
2. **Add motion to step transitions** — free, `framer-motion` and GSAP already
   installed.
3. **Expand explorables 19 → ~150.** Every concept with a parameter. This is the
   differentiator nobody else in IB/Cambridge prep has.
4. **Free specialist libraries** (§5).
5. **Licensed biology assets / an illustrator** for the ~20 flagship diagrams
   that define the brand.

---

## 5. External sources

### In use

| Source | Licence | Status |
|---|---|---|
| PhET | CC-BY | 106 embeds. Safe with attribution. |
| GeoGebra | ⚠️ restricts commercial use | **Verify — live in a paid product.** |

### Free, no key, no licence question

- **PubChem PUG-REST** (NIH, public domain) — structures and images for any compound
- **RCSB PDB** — protein structures
- **Reactome** (CC-BY) — biology pathways, commercially usable *(unlike KEGG, which needs a paid commercial licence)*
- **The Met**, **Art Institute of Chicago** — public-domain artworks for Visual Arts
- **World Bank / OECD / UN Data**, **Our World in Data** (CC-BY) — data for charts
- **Desmos** — graphing, more permissive than GeoGebra
- **Manim** — process animation; free, you pay only for compute
- Libraries: `3dmol`/`molstar`, `jsxgraph`, `maplibre-gl` + Natural Earth

### Free, needs a sign-up

Rijksmuseum, Harvard Art Museums, Openverse (key raises rate limits).

### Paid

- **Rive** — quality play for flagship diagrams; needs designer time per asset
- **Remotion** — ⚠️ paid company licence above a revenue/headcount threshold
- **BioRender** — gold standard, but standard licence prohibits commercial
  products and it has no API, so it does not scale programmatically
- **Wolfram Alpha API** — per-call, unrestylable branded output. Skip.

---

## 6. Sequence and ownership

| # | Step | Owner |
|---|---|---|
| 1 | GeoGebra licence enquiry | **You** |
| 2 | Decide on the 304 scraped senpai/alnotes PNGs | **You** |
| 3 | Figure system: mermaid + Vega-Lite + molecules + notation | Done |
| 4 | Author figures for the ~20 zero-coverage subjects | Claude |
| 5 | PubChem + smiles-drawer across chemistry topics | Claude |
| 6 | Batch-deepen Biology 9700 and Physics 9702, topic-sized batches | Claude |
| 7 | Review each batch as it lands | **You** |
| 8 | Approve the semantic accent palette | **You** |

### The real bottleneck is review, not generation

300 textbook-grade diagrams can be generated. They cannot be *certified* by the
generator. At ~5 minutes of careful checking each, that is roughly 25 hours of
expert time.

Ship in **topic-sized batches** so review is continuous. The alternative — one
25-hour block at the end — is the version where a systematic error reaches
production before anyone notices.

---

## 7. Refreshing the numbers

```ts
// npx tsx <script>
import { slugHasVisualCatalogEntry } from '@/lib/courses/visual-catalog'
// walk content/courses/**/*.json recursively, count slugs where
// slugHasVisualCatalogEntry(slug) is true, group by subject directory.
```

Diagram size distribution:

```bash
wc -l components/diagrams/*.tsx | sort -n
```
