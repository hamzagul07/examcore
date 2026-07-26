# Scroll-synced lesson diagram

Status: implemented
Related: `docs/course-explain-more.md`

## Problem

The diagram lives in `section#visual` (position 02) and the prose in
`section#notes` (position 04), with formulas and comparison tables between them.
By the time a student is reading the notes, the diagram is several screens above.
They have to hold the picture in working memory and match it to the text unaided
— which is the one thing the picture was supposed to save them from.

Text and picture only reinforce each other when they are on screen together.

## What it does

At **≥1400px**, the visual → notes run becomes a two-column grid: prose scrolls
on the left, the diagram is pinned on the right, and its step advances to match
the note block the reader is on.

Below 1400px nothing changes — same DOM order, same block layout, diagram in
normal flow. Verified `static`/`block` at 390/900/1200/1399 and `sticky`/`grid`
at exactly 1400, with no horizontal scroll at any width.

## Why block *i* maps to step *i*

Not invented for this feature. The content pipeline already asserts it twice:

- `simplerByHeading` (`lib/courses/margin-notes/adapt-lesson.ts`) pairs note
  block `i` with `simpleExplanation.steps[i]`.
- `alignDiagramSpecToSteps` (`lib/courses/attach-lesson-visuals.ts`) pads or
  truncates a diagram spec so its step count matches the lesson's.

Blocks past the last step **hold** on the final step rather than wrapping,
matching `simplerByHeading`, which simply leaves trailing blocks unpaired.

Worth being honest about the limit: the mapping is positional, not semantic. On
`ib-biology-hl/a2-2-cell-structure` it lands well (prose on "Prokaryotic versus
eukaryotic cell structure", diagram on the step describing exactly that). On
`9702/2-1-equations-of-motion` it is looser — block 2 is the SUVAT equations
while diagram beat 2 is "max height". Both come from the same authored ordering,
so alignment is as good as that ordering is, no better.

## Pieces

| File | Role |
|---|---|
| `lib/courses/lesson-step-sync.ts` | Pure mapping + active-block selection |
| `lib/courses/lesson-step-sync.test.ts` | Unit tests (`pnpm test:catalog`) |
| `lib/courses/use-lesson-step-sync.ts` | IntersectionObserver hook, returns a ref callback per block |
| `CourseLessonPage.tsx` | `.lesson-sync-region` wrapper, `data-sync`, block refs |
| `margin-notes-courses.css` | The `@media (min-width: 1400px)` block |

Enabled only when there is a diagram, notes, more than one step, and diagrams
are not paywalled.

### Selection rule

Most-visible block wins. Ties break toward the **higher** block: crossing a
boundary mid-scroll, both halves briefly report equal ratios, and preferring the
lower one runs the diagram a step ahead of the prose. `rootMargin: -20% 0px -20%`
ignores the viewport edges so the active block is one actually being read. The
hook no-ops when the derived step is unchanged, so scrolling does not re-render
the diagram every frame.

## Two bugs this surfaced

**`STEP 4 / 3`.** `CourseLessonDiagramShell` rendered the stage from a clamped
`activeIndex` but the label, dots and pills from the raw `step` prop. Any
out-of-range caller therefore showed a nonsense label *and* left no dot marked
active. Pre-existing but unreachable before: the play loop wraps, and clicks are
always in range. Fixed by deriving `activeStep = activeIndex + 1` in the shell
and using it for all chrome — callers should not need to know the shell's true
step count, which varies with explorable beats and registry-resolved specs.

**Unreachable diagram content.** Several diagrams run ~1020px tall against a
950px viewport. Pinned without a cap, their lower half — controls, readouts,
step detail — sits permanently below the fold and cannot be scrolled to, because
a sticky element does not move. Capped to
`calc(100vh - top - 24px)` with internal `overflow-y: auto`.

The first layout attempt also squeezed prose to ~528px, because `.pg` caps
content at 1200px and the grid took its column out of that. `.pg` is now widened
to 1480px for lessons that pin a diagram; prose sits at ~730px, close to the
760px it had before.
