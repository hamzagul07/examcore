# Quick check — produce, then compare

Status: implemented
Preview: `/dev/quick-check`
Related: `docs/course-explain-more.md`

## What changed

The quick-check card was a single tap-to-reveal button. Revealing an answer you
have not tried to produce feels like learning and largely is not — the gain
comes from generating the explanation yourself and then seeing where yours
differs (the self-explanation effect).

Now: the student writes an answer, then reveals. The reveal shows their attempt
**beside** the model answer rather than replacing it, and asks the only question
that matters — *"What is in the model answer that yours is missing? That gap is
the mark you would have lost."*

## Deliberate constraints

- **No grading and no AI.** Nothing is scored, nothing leaves the browser. Every
  student's answer differs, so it could not be cached the way
  `/api/courses/explain` is — it would be a genuine per-user AI cost on a free
  revision aid. The comparison is the student's to make, which is the part that
  teaches.
- **No hard gate.** "Show the answer anyway" is always available. Forcing input
  would just teach students to type "a" to get past it. The nudge is soft and
  disappears once they have written anything.
- **Attempts persist** in `localStorage`, keyed `ms:quickcheck:<lessonSlug>`, so
  a reload does not discard work. Wrapped in try/catch — private mode and quota
  errors degrade to "does not persist", never to a broken card.

## Implementation notes

`QuickCheck` in `components/courses/margin-notes/lesson-blocks.tsx`.

The card had to stop being a `<button>` — a textarea cannot live inside one. It
is now a `div` with a `button` header, which also fixed the keyboard handler:
the list-level Arrow/Enter/Space handler now bails out when the active element
is a textarea or input. Without that, **pressing Space while typing collapsed
the card mid-sentence**. That is pinned in the preview check.

After revealing, the textarea is hidden — otherwise the student's sentence
printed twice, once editable and once in "YOU WROTE". "Rewrite my answer" brings
the editor back with the draft intact.

## Free for everyone

`QUICK_CHECK_FREE` in `lib/billing/features.ts`, following the
`INTERACTIVE_DIAGRAMS_FREE` idiom — one flag re-gates both the lesson section and
its table-of-contents entry.

It was paid-only, which earned nothing: there is no marginal cost (no AI call,
nothing leaves the browser) and it removed the single place in a lesson where a
free reader has to *produce* rather than read. 467 of 1,859 lessons have items.

## The loop

Three additions, in the order a student meets them:

1. **Progress bar** — "2 of 5 answered", filling as they write. An empty bar is a
   visible, closeable gap. It counts **attempts, not correctness**, on purpose:
   nothing here is graded, and a bar that judged you would stop people writing.
2. **Completion card** — *"You wrote 5 answers instead of reading 5. That is the
   part that sticks."* Names what they actually did rather than congratulating
   them for clicking.
3. **Hand-off to marking** — "Now do the real thing →", pointing at the lesson's
   `/mark` deep link.

The hand-off is deliberately **not** gated on `locked`. The destination is the
marking tool, which has a free tier, and this is the moment a free reader has
just written several answers and is closest to attempting a real question —
which is exactly the step most users never take. Hiding the bridge from that
student would be backwards.

The question ref is only appended when it is short (≤24 chars, e.g. "9702/21 Q3").
On many lessons `practice.ref` is a full sentence, which turned the call to
action into a paragraph.

## Dev preview

`/dev/quick-check` renders the component directly with fixture data. It was
originally needed because the block was paywalled and unreachable signed-out;
now that it is free it is still the fastest way to exercise the full loop
(including the completion state) without answering every question on a real
lesson. Keep it for review and regression checks.

## Verified

Guest (signed-out) on a real lesson — `/ib/courses/biology-hl/a1-1-water`:
5 cards visible, present in the TOC, progress bar rendered, completion CTA
resolves to `/mark?subject=ib-biology-hl&topic=A1.1&component=paper_2&return=…`.

Loop on `/dev/quick-check`: 0% → 33% → 67% → 100% with labels tracking, then the
completion card appears.

Interaction, full cycle: empty-state nudge → typing (Space does not collapse the
card) → button copy switches from "Show the answer anyway" to "Compare with the
answer" → reveal shows YOU WROTE + MODEL ANSWER + gap hint → textarea hidden, no
duplicate → "Rewrite my answer" restores the editor with the draft → reload
persists it and the header reads "ANSWERED · TAP TO REOPEN". No horizontal
scroll.
