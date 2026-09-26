# Design research — what makes a study site feel like a book and a question feel like the paper

_September 2026. Eight research lenses were run in parallel against the current MarkScheme build (Margin Notes / Examiner's Ink design language) and synthesised into the changes shipped on the `claude/happy-shannon-girx5s` branch. This note keeps the findings that drove decisions, with the sources, so the next person does not have to redo the reading._

## 1. Reading on screen like a well-set book

The serious reading products converge on the same numbers: 18–21px body text, leading of 1.4–1.55 (Butterick 120–145%, iA 140%, Readwise 1.4, Medium 21px/1.58, Tufte 21px lines), a measure of 60–70 characters (Bringhurst 45–75; Dyson & Haselgrove found ~55 best for comprehension; Baymard saw copy over 80 characters skipped 41% more), left-aligned rag with automatic hyphenation, indented paragraphs with no gap (Kindle, Apple Books) and an off-white sheet (Tufte `#fffff8`, Apple Books sepia `#f8f1e3`).

Shipped: Literata "Book" default at 18px / 1.5 / 34em, first-line indents with no paragraph gap, `hyphens: auto` with limits, `text-wrap: pretty`, full-ink prose, a whiter sheet (`#fdfcf8`) on the warm canvas, one grain layer instead of two, lone equations promoted to centred display maths, a running head (folio) in the mode bar. Details and the evidence for the typeface choice are in `COURSE_TYPOGRAPHY.md`.

Not done: a Tufte-style margin column for sidenotes; page-turn "Next section" furniture; a sepia "Lamp" theme.

## 2. The question as the real paper

Real papers were downloaded and measured with a PDF parser rather than described from memory: Cambridge 9702/22 May/June 2023, the 9702/02 2022 specimen, 9702/12 May/June 2022 (multiple choice), 9709/21 May/June 2020, the 2012 "For Examiner's Use" layout, the matching mark schemes, and IB Physics HL Paper 2 TZ1 May 2023 with its markscheme.

Both boards share one grammar: A4 portrait, Arial 11pt on ~13pt leading, hairline black rules, a three-step indent ladder for 1 / (a) / (i) (22.7pt CAIE, 28.35pt IB), marks as `[n]` flush right on the last line of the part, leader dots for answer space (CAIE continuous, 26pt pitch; IB spaced inside a box), tiny rigid furniture (centred page number, `© UCLES 2023  9702/22/M/J/23` footer, bold `[Turn over` on recto pages), and mark schemes as landscape `Question | Answer | Marks` tables with a grey header.

Shipped: `components/exam-paper/ExamPaper.tsx` and `lib/design-system/exam-paper.css` reproduce the sheet, the number gutter, the part labels column, the marks column, dotted answer lines drawn with a radial gradient (border dots are browser-dependent), the running head and the footer code; MCQ A–D layout; used in lesson practice, the mark desk preview, the marked result, the attempt page and the demo. Session codes and footer codes come from `lib/exam-paper/question-parts.ts`.

Not done: the candidate box cover sheet for full mock papers; the IB boxed-answer variant; rendering AI marking as the exact landscape mark-scheme table.

## 3. What loved study products do

Almost none of it is gamification. One obvious next step (Duolingo's linear path, Brilliant's companion, Math Academy's queue). Read a little, do a little: an interaction every few paragraphs; long worked examples glaze eyes (Matuschak). Non-punitive help: Isaac Physics never reports hint use; Khan Academy's most-upvoted complaint is that hints mark you wrong. Fidelity over polish: RevisionVillage and PMT are loved because the questions look like the paper; Gradescope's per-question rubric and annotations on the student's own work is the marking gold standard.

Shipped: the exam-sheet fidelity above, the glossary's "Quiz me — cover the definitions" self-test, a calmer chrome on lessons (nav plus stepper only on phones). Not done: a hint ladder on practice questions; a single "Continue" card on the signed-in home; weekly-goal streaks with slack.

## 4. Editorial web craft

The crafted editorial sites (Distill, Tufte CSS, Quanta, Cosmos, the Awwwards and Siteinspire editorial winners) share measurable habits: a named-column grid with a real margin column; a text serif with an optical-size axis paired with a quiet grotesk and a mono for labels; body at 17–20px, 1.5–1.7 leading, 60–68 characters; warm off-white surfaces with hairline rules; depth from 1px borders and small hard offsets, not blurred grey shadows; grain as a fine feTurbulence tile at 3–6% opacity, never a visible layer.

Shipped: the grain moved to one non-blended layer; the sheet-on-desk contrast; hairline figure plates. Not done: a full named-column grid with layout classes; true 0.5px hairlines on high-DPI screens; a single motion token vocabulary.

## 5. Figures like a coursebook

Cambridge and Hodder coursebooks, the Feynman HTML edition, Distill, Tufte and PhET use a small fixed vocabulary of line weights, one accent that means "the thing being explained", greys for everything else, italic quantities with upright units, and a numbered caption beneath the figure that says what to notice.

Shipped: every diagram and figure is a `<figure>` numbered by CSS counter ("Figure n"), captions beneath, dimmed layers at 50% rather than 22% so context stays legible, hue tinting only where a diagram opts in. Not done: four fixed stroke tokens and markers scaled in stroke units; the exam-grid versus range-frame graph presets.

## 6. Motion

Emil Kowalski's and Rauno Freiberg's published standards, Material 3 tokens, Apple's reduced-motion criteria and the Next.js 16 view-transitions guide agree: motion should be rare, under 300ms for UI, ease-out on entry and faster on exit, scaled to the size of what moves, and absent from anything a student does dozens of times an hour. Shipped: reveal animations kept to marketing and hub pages; the diagram stepper cross-fades instead of moving. Not done: the token vocabulary; lesson-to-lesson page turns with View Transitions.

## 7. Comfort and accessibility

Most students read fastest in positive polarity and want a dimmer, warmer page at night, not an inverted one; blue-light health claims are weak (Cochrane 2023), so warm modes are comfort features. Neon accents and 9–11px mono labels fail on dark paper. Shipped: `.micro` labels raised to 12px; the late-night accent retuned from neon to a calmer green; hide-on-scroll nav budgeted into jump targets. Not done: a sepia theme with auto-by-time; APCA contrast checks in a unit test; a reading ruler; a keyboard shortcut cheat sheet.

## 8. The student's voice

A lens on student forums (r/6thForm, r/IBO, r/alevel) was started and stopped before synthesis to keep within budget; the products they recommend to each other (PMT, ZNotes, Save My Exams before its paywall, RevisionVillage) all share the fidelity-to-the-paper trait in lens 3.
