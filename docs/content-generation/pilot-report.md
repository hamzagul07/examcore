# Pilot lesson generation report

**Updated:** 2026-06-07  
**Subject:** 9702  
**Generator:** b-v3-pilot-2  
**Status:** Post-processed v2 pilots ready for browser review

## v2 fixes (pilot review round)

| Issue | Fix |
|-------|-----|
| Raw `<img>` in worked examples | Strip at sanitize + post-process; render diagrams from `extracted_diagrams` via `sourceQuestionId` |
| MCQ options on one line | `parseMcqOptions()` in `CourseWorkedExampleReveal` — vertical A–D list for Paper 1 |
| Empty subsection headings | Prompt tightened; `removeOrphanHeadings()` drops headings with no following content |
| Terse quick-check prompts | `ensureFullQuickCheckPrompt()` at generate + enrich render time (min 6 words) |
| Glossary pill inconsistency | `glossaryLabelFromFlashcard()` rejects truncated-question pillLabels; rules for s–t / v–t graphs |
| Past paper practice section | New `pastPaperPractice` section + `CoursePastPaperPractice.tsx` after worked examples |

**Regeneration note:** Full Gemini regen blocked (daily quota exhausted on `gemini-2.5-pro`). Existing v1 pilots were **post-processed** with `scripts/post-process-pilot-lessons.mjs` to apply all deterministic fixes. Re-run `npx tsx scripts/generate-pilot-lessons.mjs` after quota resets for fresh LLM prose.

**Diagrams:** `extracted_diagrams` table currently has **0 rows**. Wiring is in place; worked examples show `[Figure: alt]` placeholders until bulk extraction populates diagrams.

---

## Preview URLs

| Paper | Topic | Review URL | HTTP check |
|-------|-------|------------|------------|
| 1 | 2.1 | [/courses/9702/paper-1/2-1-equations-of-motion?pilot=1](/courses/9702/paper-1/2-1-equations-of-motion?pilot=1) | 200 ✓ |
| 2 | 7.1 | [/courses/9702/paper-2/7-1-progressive-waves?pilot=1](/courses/9702/paper-2/7-1-progressive-waves?pilot=1) | 200 ✓ |
| 3 | 1.3 | [/courses/9702/paper-3/1-3-errors-and-uncertainties?pilot=1](/courses/9702/paper-3/1-3-errors-and-uncertainties?pilot=1) | slow compile — verify in browser |
| 4 | 25.3 | [/courses/9702/paper-4/25-3-hubbles-law-and-the-big-bang-theory?pilot=1](/courses/9702/paper-4/25-3-hubbles-law-and-the-big-bang-theory?pilot=1) | slow compile — verify in browser |
| 5 | 1.3 | [/courses/9702/paper-5/1-3-errors-and-uncertainties?pilot=1](/courses/9702/paper-5/1-3-errors-and-uncertainties?pilot=1) | slow compile — verify in browser |

Route: `app/(marketing)/courses/[code]/[...slug]/page.tsx`  
Loader: `loadPaperScopedLesson()` — `?pilot=1` → `.pilot.json`

---

## Post-process summary (v2)

| Tuple | Past-paper cards | Diagrams attached | `generatorVersion` |
|-------|------------------|-------------------|--------------------|
| P1 / 2.1 | 8 | 0 (no DB rows) | b-v3-pilot-2 |
| P2 / 7.1 | 8 | 0 | b-v3-pilot-2 |
| P3 / 1.3 | 8 | 0 | b-v3-pilot-2 |
| P4 / 25.3 | 8 | 0 | b-v3-pilot-2 |
| P5 / 1.3 | 8 | 0 | b-v3-pilot-2 |

---

## Review checklist

- [ ] Open each preview URL above in the browser
- [ ] P1: MCQ options render as vertical list; no raw `<img>` text
- [ ] All: Past paper practice section shows 6–8 cards with Try / Mark scheme buttons
- [ ] All: Quick-check prompts are full sentences (not single-word fragments)
- [ ] All: Flashcard pills are 1–3 word labels (e.g. "s–t gradient", not "What does the gradient")
- [ ] P2/P5: judge whether mark-point solutions are too terse for students
- [ ] Approve before promoting to published `content/courses/9702/{slug}.json`
- [ ] No PR until Hassan signs off on browser review
