# Course typography — what the research says, what we chose, how to tune it

_September 2026. Scope: the body text of course lessons (`/courses/...`, `/ib/courses/...`). The site's brand faces — Newsreader for headings, Instrument Sans for UI, IBM Plex Mono for labels, Caveat for margin notes — are unchanged._

## The problem

Lesson prose was set in **Instrument Sans at 16px / 1.55**, inherited from the page `body`. Instrument Sans is a UI face: narrow fit, modest x-height, tuned for buttons and labels. Students read lessons for twenty to forty minutes at a time, often on a phone. Nothing about the prose had been chosen for that.

## What the evidence says

1. **There is no single best font, and the difference between fonts is large per person.** The best-controlled study of screen reading — 352 readers, 16 fonts, on their own devices — found a **35% gap between an individual's fastest and slowest font** with comprehension unchanged, and that the fastest font differed from person to person. The authors' conclusion is _individuation_: let the reader choose. ([Wallace et al., ACM TOCHI 2022](https://dl.acm.org/doi/10.1145/3502222); [summary](https://phys.org/news/2022-07-personalized-fonts-comprehension.html))
2. **On average, one face did best on speed and comprehension together: Noto Sans.** Across the same sixteen candidates, Noto Sans and Lato led when both measures were combined, with Noto Sans "the clear favourite across the full set". Its anatomy is the readable kind: generous x-height, open apertures, low stroke contrast, wide forms, short ascenders — it was drawn for small screens. Younger readers read sans faces faster; older readers did better with bold serifs. ([Readability Matters, base font effect](https://readabilitymatters.org/articles/font-effect); [The Readability Consortium](https://thereadabilityconsortium.org/research/))
3. **Size matters more than family.** Larger print improves reading speed across the board; x-height only matters when text is small. ([Readability Matters, x-height](https://readabilitymatters.org/articles/research-highlight-how-important-is-x-height-for-font-legibility))
4. **For a reading serif, the ones designed for screens: Literata and Source Serif.** Literata was commissioned as the Play Books default; it carries an optical-size axis so small text keeps its strokes. Source Serif was best in the sentence-reading task of the Readability Consortium's work. ([Literata](https://en.wikipedia.org/wiki/Literata); [VSS 2024 posters](https://readabilitymatters.org/articles/vss-2024-readability-research-posters-published))
5. **"Dyslexia fonts" do not help; spacing does.** Peer-reviewed comparisons of OpenDyslexic and Dyslexie against Arial and Times found no gain in speed or accuracy. What does have evidence: wider letter spacing (Zorzi et al. 2012 — about 2.5× normal, +20% speed, half the errors, via reduced crowding), more line spacing, larger size, and sans / roman rather than italic (Rello & Baeza-Yates 2013). ([Annals of Dyslexia 2020](https://link.springer.com/article/10.1007/s11881-020-00194-x); [Nessy summary](https://nessy.com/en-us/dyslexia-explained/understanding-dyslexia/dyslexia-fonts-do-they-work/))
6. **Atkinson Hyperlegible** was designed with the Braille Institute for low-vision readers: exaggerated differentiation of I/l/1, O/0, c/e, tested with low-vision readers during design. It is the defensible "clear letterforms" choice, unlike the dyslexia fonts. ([Braille Institute](https://www.brailleinstitute.org/freefont/); [Atkinson Hyperlegible Next](https://www.printmag.com/type-tuesday/atkinson-hyperlegible-next-applied-design/))
7. **Lexend** has classroom results (wider variants helped struggling readers) but the studies are the designer's own and not well controlled; treated as a maybe, not adopted. ([Adobe overview](https://www.adobe.com/express/learn/blog/what-is-lexend-font))

## Decisions

| | Choice | Why |
|---|---|---|
| **Default prose face** | **Noto Sans** (variable, 400–700, italic) | Best average on speed + comprehension; small-screen anatomy; young readers favour sans. |
| **"Book"** | **Literata** (variable, optical size, italic) | The screen serif made for long reading; sits naturally beside KaTeX maths. |
| **"Clear"** | **Atkinson Hyperlegible Next** (variable) | Distinct letterforms for low vision and for readers who lose their place. |
| **Size** | 17px desktop, 16.5px phone; S/M/L/XL = 0.94 / 1 / 1.12 / 1.28 | Size is the biggest lever; the default is a step up from 16 and the reader can go further. |
| **Leading** | 1.65 (1.9 with airy spacing) | Long-form comfort; paragraphs breathe at 1.1em. |
| **Measure** | 68ch (60ch with airy spacing) | 60–70 characters per line; the 760px article otherwise runs to ~80. Worked examples and tables keep full width. |
| **Airy spacing** | letter-spacing 0.05em, word-spacing 0.12em, line-height 1.9 | The dyslexia intervention with evidence, offered to everyone. |
| **Headings, UI, mono** | unchanged | Brand. Newsreader over Noto Sans is a conventional serif-display / sans-text pairing. |
| **KaTeX** | 1.1em inside prose (default 1.21em) | KaTeX scales up to match Computer Modern against low-x-height faces; next to Noto Sans it read oversized. |
| **Colour** | prose in full ink (`--text`), not the muted secondary | Lesson intros and rich text were set in `--text-2`. |

Nothing here is dyslexia-specific in name. The menu says "Airy spacing" and "Clear", and the hint tells the truth: it differs person to person, try what reads fastest.

## Implementation

- Fonts: `app/fonts/reading.ts` — `next/font/local`, self-hosted latin woff2 subsets from Google (35 + 38 KB Noto, 83 + 86 KB Literata, 33 KB Atkinson), OFL-licensed (`app/fonts/files/OFL.txt`). Only Noto Sans is preloaded; the others are fetched on first use. Loaded by the `courses` and `ib/courses` layouts only, so no other page pays for them.
- CSS: end of `lib/design-system/margin-notes-courses.css` — variables on `.lesson-page`, overrides per `data-reading-font/size/air`, and the prose selectors (`.course-rich-text--prose`, intro, worked examples, glossary, quick-check questions, `.lead`).
- Preference: `lib/courses/reading-prefs.ts` (localStorage, tolerant parser, tested); the **Aa** menu in the lesson mode bar (`CourseLessonPage.tsx`) writes it and the root `<main>` carries the data attributes. Each typeface option is set in its own face so the reader sees the difference before choosing; the menu closes on a click elsewhere or Escape.
- **Across devices:** a signed-in reader's choice is also saved to `user_profiles.reading_prefs` (through `/api/account/preferences`, parsed on the way in) and read back on the next lesson open. The device's own copy applies first so nothing swaps on load; the account's copy wins if it differs.
- **No reflow on load:** `adjustFontFallback` gives each face a size-adjusted system fallback, so text set before the woff2 arrives keeps its line breaks.
- **Dark themes** nudge the variable weight to 430 (`late-night`); **phones** hyphenate at L, XL and airy so a long word does not sit alone on a line.

## How to check it

- `pnpm exec next dev -p 3100`, open a maths lesson (`/courses/9709/1-1-quadratics`) and an essay subject, at 1280 and 390 wide; try each typeface, XL, airy. Only the chosen family's woff2 should be requested.
- If a face is added or changed: add the latin woff2 to `app/fonts/files/`, a `localFont` in `reading.ts` (with `adjustFontFallback`), the OFL entry, a `data-reading-font` override, a `[data-face]` rule for the option label, a label and a hint.

## Not done, on purpose

- No site-wide font change; the brand faces stay.
- No per-reader measurement of speed. A follow-up could log `reading_font_changed` and compare lesson completion by choice.
- No Lexend, no OpenDyslexic — see 5 and 7 above.
