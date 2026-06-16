# MarkScheme — Course UI Handoff ("Margin Notes" design system)

This folder is a **working React/HTML prototype** of the redesigned course experience.
Your job (Cursor) is to **port this exact UI/design into the real Next.js app**, but render it
with the **content, topics and diagrams that already exist in the codebase** — do **not** invent
content, and do **not** restyle. Match the prototype pixel-for-pixel, then feed it real data.

Everything here is plain React (loaded via Babel in `MarkScheme Courses.html`). In the real app,
convert each `page-*.jsx` / component into a `.tsx` Server/Client component and keep the markup,
class names and CSS identical.

---

## 1. What's in this folder

| File | What it is | Port it to |
|---|---|---|
| `theme.css` | **Design tokens** — colours, fonts, spacing, both themes (`paper` + `night`), buttons, chips, cards, the "exam sheet" + hand-annotation primitives. | A global stylesheet (e.g. extend `app/globals.css`). Keep variable names. |
| `courses.css` | **Component styles** for every course screen + design polish (reading bar, reveals, card accents). | Same global stylesheet (or a CSS module per section). |
| `shared.jsx` | `Nav`, `Footer`, `Breadcrumb`, `Ring` (mastery ring), `ReadingProgress`, hand-annotation helpers (`InkCircle`, `InkScribble`, `MarginNote`). | Shared layout components. |
| `page-catalog.jsx` | The course **catalog** (`/courses`). | `app/courses/page.tsx` |
| `page-hub.jsx` | A **course hub** — paper tabs + syllabus spine (`/courses/[code]`). | `app/courses/[code]/page.tsx` |
| `page-lesson.jsx` | A **lesson** — all the learning sections (`/courses/[code]/[topic]`). | `app/courses/[code]/[slug]/page.tsx` |
| `page-subjects.jsx`, `page-dashboard.jsx`, `page-pricing.jsx` | The **other sections** (Subjects, Progress, Pricing) on the same theme. | their existing routes |
| `diagram.jsx` | The **live diagrams** (`LiveDiagram` fluid/pressure, `ShmDiagram`, `VtDiagram`) + a `LessonDiagram` dispatcher. | A `components/diagrams/` folder. **Replace with your real diagrams** — see §5. |
| `data.jsx`, `course-data.jsx`, `lessons-9702.jsx` | **Example data only** — shows the exact shapes the components expect. | Delete; bind your real data to the same shapes. |
| `MarkScheme Courses.html` | The shell that wires it together + the Tweaks panel (theme/ink/density toggles). | Reference only; the Tweaks panel is optional. |

> Run the prototype: open `MarkScheme Courses.html`. Toggle **paper/night** with the ☾/☀ button.

---

## 2. Design tokens (from `theme.css`)

Two themes, switched by `data-theme="paper"` (default) or `data-theme="night"` on `<html>`.

**Fonts** (load via `next/font` or `<link>`):
- `Newsreader` (serif) — display & headings, italics for emphasis
- `Instrument Sans` — UI / body
- `IBM Plex Mono` — codes, labels, overlines
- `Caveat` — handwritten margin notes / examiner ink

**Key CSS variables** (see `theme.css` for the full set — never hard-code hex, always use the var):
`--bg`, `--bg-soft`, `--surface`, `--surface-2`, `--border`, `--border-strong`,
`--text`, `--text-2`, `--muted`, `--ink` (brand green / examiner ink), `--ink-soft`, `--ink-border`,
`--red` (examiner correction), `--amber`, `--pen`, `--paper`, `--paper-rule`,
subject accents `--acc-blue` `--acc-violet` `--acc-teal` `--acc-rose` `--acc-slate`,
radii + shadows (`--shadow-card`, `--shadow-pop`, `--shadow-hard`, `--cta-shadow`).

Brand greens: `#1e8a5e` (paper) / `#00f5a0` (night). Examiner red: `#b04848` / `#e06c6c`.

Reusable classes already defined: `.btn-primary`, `.btn-ghost`, `.btn-underline`, `.card`, `.chip`
(`.ok/.no/.warn/.dim/.outline`), `.sheet` + `.sheet-line` + `.stamp` + `.tally` (the exam-paper
artifact), `.h-display/.h2/.h3/.lead/.body-2/.micro/.overline`, `.serif/.mono/.hand`.

---

## 3. Page → route mapping & the data each needs

### Catalog — `page-catalog.jsx` → `/courses`
Renders `SUBJECTS` as a card grid + a "continue learning" strip + family filter. Subject shape:
```ts
type Subject = {
  code: string;        // "9702"
  name: string;        // "Physics"
  glyph: string;       // a single display glyph, e.g. "Ω"
  acc: string;         // accent token name: "acc-violet" | "acc-blue" | "acc-teal" | "ink" | ...
  level: string;       // "A-Level"
  fam: 'Sciences'|'Maths'|'Commerce'|'Humanities';
  units: number; lessons: number; q: number;  // counts shown on the card
  prog: number;        // 0–100 % covered (drives the mastery ring vs "FREE FOREVER" stamp)
};
```

### Course hub — `page-hub.jsx` → `/courses/[code]`
Paper tabs + a syllabus "spine" of units → topics. Course shape:
```ts
type Course = {
  blurb: string;
  papers: { id: number; name: string; topics: number }[];
  spines: { [paperId: number]: Unit[] };   // per-paper topic spine
  units?: Unit[];                            // fallback if no `spines`
};
type Unit  = { unit: string; items: Topic[] };       // unit = "4 · Forces, density & pressure"
type Topic = { n: string; t: string; done?: boolean; active?: boolean }; // n = "4.3"
```
Clicking a topic routes to the lesson. `done` ticks the checkbox; `active` flags "CONTINUE".
**Use your real syllabus tree here.**

### Lesson — `page-lesson.jsx` → `/courses/[code]/[topic]` ⭐ the important one
Every section renders **conditionally on whether its field is present** — so you bind your existing
per-topic content to this shape and the right sections appear automatically:
```ts
type Lesson = {
  code: string; sub: string; point: string; name: string;   // "9702","Physics","4.3","Density and pressure"
  heroPre?: string; heroEm?: string;   // optional italic hero, e.g. "Density &" + <em>pressure</em>
  papers: string; tag: string; mins: number;
  intro: string;
  objectives?: string[];
  simple?: { lead: string; analogy: string };               // "In simple terms" + "Think of it like…"

  diagram?: 'fluid' | 'shm' | 'vt' | string;                // see §5
  steps?: { n: number; title: string; body: string }[];     // step cards beside the diagram

  formulas?: { tex: string; parts: { s: string; m: string }[] }[];  // tappable symbols
  notes?:    { h: string; p: string; tip?: string }[];              // full notes (+ exam tip)
  worked?:   { title: string; q: string; steps: string[] }[];       // reveal-step-by-step
  glossary?: { t: string; d: string }[];
  quiz?:     { q: string; a: string }[];                            // "Quick check" (tap to reveal)
  flashcards?: { q: string; a: string }[];                          // flip cards
  takeaways?: string[];
  faqs?:     { q: string; a: string }[];
  practice:  { ref: string; marks: number; text: string };          // → routes to /mark

  prev?: Topic; next?: Topic; related?: Topic[];   // optional; otherwise computed from the spine
  outline?: boolean;   // true = "outline topic" banner + lighter layout (no full notes yet)
};
```
Section order in the prototype: Simple terms → **Explore the concept** (diagram) → Key formulas →
Full notes → Worked examples → Concept map → Glossary → Quick check → Flashcards → Key takeaways →
Practice → FAQs. The sticky table-of-contents and reading-progress bar are automatic.

### Other sections (same theme)
- `page-subjects.jsx` → your subjects directory
- `page-dashboard.jsx` → progress (streak, recently-marked exam sheet, weak spec points)
- `page-pricing.jsx` → pricing (free vs founding-member)
Keep their styling; wire to your real user/progress data.

---

## 4. Theming
- Set `data-theme` on `<html>` and the whole UI re-skins. Default `paper`; support `night`.
- Subject accent: pass the subject's `acc` token; components read `var(--${acc})`.
- The **Tweaks panel** (`tweaks-panel.jsx`) is a prototype-only authoring tool — you don't need to ship it.

---

## 5. Diagrams — use YOUR existing diagrams
The prototype ships three sample live diagrams (`fluid`, `shm`, `vt`) behind a dispatcher:
```jsx
<LessonDiagram type={lesson.diagram} step={step} setStep={setStep} />
```
**You already have diagram data/components for every topic.** Do this:
1. Keep the **"Explore the concept" section shell** and the **step-card list** (driven by `lesson.steps`).
2. Replace the body with **your existing diagram component**, rendered inside the `.diagram-wrap`
   chrome (header bar + `.diagram-svg` + `.diagram-dots`) so it inherits the look.
3. Map your diagram's "steps" to the `steps[]` array so the cards stay synced (`step` / `setStep`).
If a topic has no diagram, omit `diagram`/`steps` and that section simply doesn't render.

---

## 6. Porting checklist (Next.js + TS)
- [ ] Move `theme.css` + `courses.css` into the global stylesheet; load the 4 fonts.
- [ ] Convert each `page-*.jsx` to a `.tsx` route/component — **keep markup & class names verbatim**.
- [ ] Components that use `useState`/`useEffect`/`IntersectionObserver` (lesson, hub, diagrams,
      flashcards, reading bar) must be `"use client"`.
- [ ] Replace `go(page, opts)` navigation with `next/link` / `useRouter` (routes in §3).
- [ ] Bind your existing course tree + per-topic content to the shapes in §3 (a small adapter that
      maps your DB/content models → these props is the cleanest approach).
- [ ] Slot your real diagrams in per §5.
- [ ] Keep `data-screen-label` attributes if convenient (handy for analytics/QA) — optional.
- [ ] Verify both `paper` and `night` themes; check keyboard focus + reduced-motion (already handled in CSS).

**Do not** change the visual design, spacing, type scale, or colours. **Do not** generate placeholder
topic content — every lesson must come from existing data. If a field has no data, leave it undefined
so the section hides cleanly.
