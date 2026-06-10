# Handoff: MarkScheme.app — "Margin Notes" Redesign

## Overview
A complete visual redesign + UX build-out of MarkScheme.app (Cambridge past-paper marking platform). The new identity — **"Margin Notes"** — is a warm, editorial, exam-paper aesthetic: serif display type, cream paper surfaces, handwritten examiner annotations in green ink, and the marked exam script as the hero artifact everywhere. It replaces the previous dark neon dev-tool look.

This package covers: landing page, /mark flow (single question, whole paper, mock exam; structured/essay/MCQ result views), ZNotes-style subject catalog + per-subject paper browser, courses (catalog, lesson, flashcards), progress dashboard (incl. empty state), pricing, onboarding, account, how-it-works, guides, story page, global ⌘K command bar, "Ask MarkScheme" chat widget, mobile tab bar, and a dual theme system (Paper light / Night dark).

## About the Design Files
The files in `prototype/` are **design references created in HTML** — a working clickable prototype showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the existing examcore codebase** (Next.js App Router, Tailwind CSS v4, shadcn/ui, `ec-*` CSS custom-property token system, next/font). Map the prototype's CSS variables onto a new generation of `ec-*` tokens in `lib/design-system/theme.css`, and rebuild components as React/TSX using the repo's existing patterns (server components where pages are static, client components for interactivity).

The prototype-only files `tweaks-panel.jsx` (design-review controls) and the deck/canvas tooling are NOT part of the product — ignore them.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy, and interactions are final design intent. Recreate pixel-faithfully, but use the codebase's existing infrastructure (Tailwind theme mapping, next/font, lucide icons where glyphs are placeholders).

## Design Tokens

### Theme: `paper` (light, default — replaces "zen")
| Token | Value | Use |
|---|---|---|
| `--bg` | `#f6f1e7` | page canvas |
| `--bg-soft` | `#f1ebdd` | tinted sections, footer |
| `--surface` | `#fffcf4` | cards |
| `--surface-2` | `#faf5e9` | nested surfaces |
| `--paper` | `#fffdf6` | exam-sheet paper |
| `--paper-rule` | `#e4ddca` | ruled lines on sheets |
| `--border` | `#e3dac6` | hairlines |
| `--border-strong` | `#25221b` | exam-sheet border, ghost buttons |
| `--text` | `#25221b` | primary text |
| `--text-2` | `#5c5546` | secondary text |
| `--muted` | `#8d8470` | captions, mono labels |
| `--ink` | `#1e8a5e` | BRAND: examiner green ink (CTAs, marks earned, links) |
| `--ink-soft` | `rgba(30,138,94,0.11)` | green tint fills |
| `--ink-border` | `color-mix(ink 38%, transparent)` | green tint borders |
| `--red` | `#b04848` | marks lost, examiner red ink |
| `--red-soft` | `rgba(176,72,72,0.09)` | red tint fills |
| `--pen` | `#2b3a8c` | student's handwriting (blue biro) |
| `--amber` | `#9a7a40` | warnings, partial credit |
| Accents | blue `#3a5fb8` · violet `#6b5b8a` · teal `#1f8a8a` · rose `#ac5276` · slate `#5c6470` | subject colors |

### Theme: `night` (dark — replaces "late-night")
| Token | Value |
|---|---|
| `--bg` `#14120d` · `--bg-soft` `#1a1711` · `--surface` `#1e1b13` · `--paper` `#211e14` · `--paper-rule` `#383223` |
| `--border` `#322d1f` · `--border-strong` `#f0ead9` · `--text` `#f0ead9` · `--text-2` `#c4bba1` · `--muted` `#837b64` |
| `--ink` `#00f5a0` (the original brand green survives as night ink) · `--red` `#e06c6c` · `--pen` `#9eb0f5` · `--amber` `#d9b36a` |
| Accents: blue `#8fa9f7` · violet `#b5a3e8` · teal `#4fd1c5` · rose `#e788ad` · slate `#9aa5b4` |
| Buttons on ink backgrounds use dark text `#07130d` |

### Typography (Google Fonts via next/font)
| Role | Font | Notes |
|---|---|---|
| Display / headings / nav links | **Newsreader** (serif) | weight 500 headings, italic for emphasis words; h-display `clamp(44px,6vw,76px)`, lh 1.04, ls −0.025em; h2 `clamp(30px,4vw,44px)` lh 1.1 |
| UI / body | **Instrument Sans** | body 16px lh 1.55; lead 18px lh 1.65 color text-2 |
| Codes / labels / overlines | **IBM Plex Mono** | overline 12px, ls 0.2em, uppercase, muted; mark codes 12–13px bold |
| Handwriting (Examiner's Ink, notes, captions) | **Caveat** | sheet working 23px lh 1.26 in `--pen`; examiner notes 19–22px in ink/red |

Replaces: Inter, Fraunces, Kalam (drop), keeps Caveat; JetBrains Mono → IBM Plex Mono.

### Spacing / radius / shadows
- Page container: max-width 1200px, padding 0 32px (18px ≤900px). Section spacing: `padding-top: 88px` (64px mobile).
- Radius: cards 14px, large promo cards 18–20px, buttons/chips pill (999px), inputs 10px, exam sheet 2px (paper is square).
- Shadows: card `0 6px 18px rgba(80,70,50,0.06)`; pop/hover `0 14px 36px rgba(80,70,50,0.12)`; exam sheet hard offset `6px 6px 0 rgba(37,34,27,0.1)`; CTA glow `0 10px 24px rgba(30,138,94,0.25)`.
- **No background-color transitions on themed surfaces** (theme flip must be instant); transitions limited to transform/box-shadow.

## Signature Components

### Exam Sheet (the brand artifact)
Paper card, 1.5px `--border-strong` border, hard offset shadow, mono header row, ruled lines (`border-bottom: 1px solid --paper-rule`). Each line: Caveat handwriting in `--pen` left, **mark stamp** right. Stamp = mono 12.5px bold pill, 2px tinted border, rotated −3°, green (`M1 ✓`) or red (`A0 ✗`). Optional: rotated score **tally badge** (top-right, ink bg, rotated 4°), red/green Caveat **margin notes**, dashed mono **scheme citation** box (`MS 9709/12/M/J/23 · …`).

### Hand annotations
SVG ink circle around a headline word, scribble underline, rotated Caveat margin note with hand-drawn arrow. Stroke = `--ink`, 2.2px, round caps. Hidden on mobile and when reduced-motion users would find them noisy (they're decorative).

### Buttons
- Primary: ink pill, white/dark text, 14px/28px padding, CTA glow shadow, hover translateY(−1px). `white-space: nowrap`.
- Ghost: 1.5px `--border-strong` outline pill.
- Underline: serif text link with 1.5px ink underline.

### ZNotes-style subject card (`scard2`)
Card, no padding; top "tile" 96px gradient (`135deg, color-mix(sc 72%, bg) → sc`) with 42px serif glyph + "2026 SYLLABUS" badge; body: serif name 20px, mono code, stat row (mono 10.5px: papers / lessons / marked counts with `--sc` colored numbers), footer quick links. Hover translateY(−4px) + pop shadow. Subject accent passed as `--sc` CSS var.

### Others (see prototype files for full detail)
Level tabs (pill segmented), search pill, chips (ok/no/warn/dim/outline), comparison table (highlighted MarkScheme column with ink tint), band meter (4 segments), MCQ grid (8 cols, wrong = strikethrough + Caveat correction), mock-exam clock (mono tabular-nums, red <10min), command bar (⌘K overlay, 560px, serif input), Omni chat panel + Caveat FAB, mobile tab bar (5 tabs, ≤900px), footer (4-col on bg-soft).

## Screens / Views (route mapping)
| Prototype | examcore route | Notes |
|---|---|---|
| `page-landing.jsx` | `app/(marketing)/page.tsx` | hero w/ annotated headline + marked sheet; trust strip; features (5 cards, first spans 2); steps; courses promo; subjects preview (8 scard2); founder quote; comparison table; FAQ accordion; final CTA |
| `page-mark.jsx` | `app/mark/` | 3-step bar; modes: single/whole/mock; upload w/ page thumbs + Q-assignment selects; marking scan animation; results: structured (clickable sheet lines sync with audit panel + scheme citations), essay (band meter, AO criteria), MCQ (40-cell key grid, error patterns), whole-paper (per-Q bars + projected grade), mock (timer + palette → whole-paper result) |
| `page-subjects.jsx` | `app/subjects/` | tabs A-Level/O-Level/IB-soon, search, scard2 grid, stats strip |
| `page-subject-detail.jsx` | `app/subjects/[code]/` | glyph header, year-filtered session list w/ variant buttons, course card, "where students lose marks" top-5, boundary note |
| `page-courses.jsx` | `app/courses/` | tile catalog; lesson: sticky TOC sidebar, "explain simpler" toggle (swaps copy), exam-tip callout, flip flashcards, practice question → mark CTA |
| `page-misc.jsx` | `app/dashboard/`, pricing | dashboard (grade estimate, coverage bars, mastery heatmap, fix-next list, empty state) + pricing (3 tiers, middle highlighted w/ Caveat badge) |
| `page-onboarding.jsx` | `app/onboarding/` | 3 steps: level → subjects multi-select → session + goal grade |
| `page-account.jsx` | `app/account/` | profile, plan + usage meters, subject chips, email prefs, data honesty block |
| `page-content.jsx` | `/how-it-works`, `/guides` | 4 alternating steps + can/can't honesty grid; guides hub w/ featured + 6 cards |
| `page-story.jsx` | `/story` | founder quote, timeline, three promises |
| `shared.jsx`, `command-bar.jsx`, `omni.jsx` | layout components | nav (sticky, blur, serif lowercase links, ⌘K button, theme flip, avatar), footer, tab bar, command bar, Omni widget |

## Interactions & Behavior
- Theme: `data-theme="paper|night"` on `<html>`; instant flip (no bg transitions); persist per user.
- Entry animations: translate-only (`translateY(10px)→0`), never animate opacity from 0 (content must be visible if animations fail). Stamps "thunk" in: `scale(1.12) rotate(-7°) → scale(1) rotate(-3°)`, 260ms staggered ~120ms.
- Results: clicking a sheet line or audit row selects the matching mark; selected row tinted `--ink-soft`; scheme citation + examiner note update.
- FAQ: instant expand (no max-height transition). Flashcards: instant content swap with slight rotate, no 3D flip.
- ⌘K opens command bar; ↑↓/Enter/Esc; filters pages + subjects.
- Mock timer: real 1s interval countdown, red under 10:00.
- Mobile ≤900px: hamburger + dropdown, bottom tab bar (Mark/Learn/Subjects/Progress/You), Omni FAB lifts above it, grids collapse to 1–2 cols, margin-note annotations hidden.

## State Management
Prototype uses local state + localStorage routing — in examcore use real routes, server data, and existing auth. Client state needed: theme, mark-flow stage/mode, selected mark, demo switcher (drop in production), FAQ open index, flashcard flips, mock timer, command bar open, subject search/tabs/year filter.

## Assets
No raster assets. Glyphs are unicode characters as placeholders (∫ Ω ⌬ ϕ £ ¶ {} " § ◬ Ψ ∴ ∑ λ ⚗) — consider replacing with lucide icons or custom SVG monograms. Annotation SVGs (circle/scribble/arrow) are inline paths in `shared.jsx` — copy them as-is. Founder photo is a placeholder circle — supply a real image.

## Files
- `prototype/MarkScheme Prototype.html` — entry, router, theme wiring
- `prototype/theme.css` — ALL design tokens + shared components (nav, buttons, cards, exam sheet, annotations, footer)
- `prototype/pages.css` — per-page styles (search this file by section comments)
- `prototype/shared.jsx` — Nav, Footer, TabBar, annotation SVGs, Sheet/SheetLine primitives
- `prototype/page-*.jsx` — one file per screen (see route table)
- `prototype/command-bar.jsx`, `prototype/omni.jsx` — global widgets
- `prototype/tweaks-panel.jsx` — design-review tooling, NOT product; ignore
