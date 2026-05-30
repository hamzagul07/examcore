# Sprint 37 — Marking explanation quality (rendering + Omni context)

## Part A.1 — Investigation findings

| Surface | Before | After |
|--------|--------|-------|
| `MarkingResultView` (single-question) | `MathText` (KaTeX only, no markdown) | `RichTextRenderer` |
| `WholePaperResultView` | `MarkdownMath` | `RichTextRenderer` (via shared stack) |
| `StreamingMessage` (Omni) | Duplicated inline `MarkdownBody` | `RichTextRenderer` |
| `MarkdownWithMath` (solutions) | Own component map | `RichTextRenderer` `variant="light"` |
| `PaperPreview` / `DiagnosticPreview` | `MathText` | Unchanged (question previews, not marking feedback) |
| Dashboard history cards | No inline feedback prose | Unchanged (links to attempt detail → `MarkingResultView`) |

**Root cause:** Single-question results used `MathText`, so Claude’s markdown (`**bold**`, lists) and mixed `$...$` notation rendered as raw text. Whole-paper already used markdown+math after Sprint 31.

### Sample Accounting attempt (9706/22, DB)

Attempt `2d5e8457-c289-4f7e-a9e2-7a9de997a1ac` — 2/6 marks.

- **Summary:** Prose with `$\\$152{,}000$`-style currency and narrative (no raw `**` in this sample, but point reasoning uses examiner tone).
- **Per-mark reasoning:** e.g. M1 lost — *"Revenue for Product Exe as $11{,}900 \\times \\$40 = \\$476{,}000$..."* with `margin_note`, `error_classification: arithmetic`.
- **weak_topics:** Plain strings (list items).
- **Notation needs:** LaTeX inline math, markdown-capable prose, lists; tables possible from Claude (now supported via `remark-gfm`).

## Part A.2 — Consolidated renderer

- **Primary component:** `components/RichTextRenderer.tsx`
- **Shared styling:** `lib/rich-text/markdown-components.tsx` (`dark` | `light` variants, theme CSS vars on dark)
- **Plugins:** `remark-math`, `remark-gfm` (tables, strikethrough, autolinks), `rehype-katex`
- **Backward compat:** `MarkdownMath` re-exports `RichTextRenderer`

## Part A.3 — Surfaces updated

- `components/MarkingResultView.tsx` — summary, marks, weak topics, study next, marking note, question text, band_result block
- `components/WholePaperResultView.tsx` — all prior `MarkdownMath` call sites
- `components/omni-ai/StreamingMessage.tsx`
- `components/MarkdownWithMath.tsx`
- `app/mark/page.tsx` — passes `attemptId`; Omni context → `marking_result` after mark
- `app/dashboard/attempt/[id]/page.tsx` — `attemptId` + Omni `marking_result` context

## Part A.4 — Manual verification (recommended)

Run locally after deploy; build passed (`pnpm build`).

1. Chemistry 9701 point-based — M1/A1 math + bold  
2. **Accounting 9706** — currency/formulas in summary & reasoning  
3. Physics 9702 MCQ — explanations  
4. History 9489 LoR — band justification (also added `band_result` UI on single-question view)  
5. Math 9709 — regression on `$...$` / `$$...$$`  
6. Whole-paper — unchanged data path, same renderer family  

## Part B.1 — Omni architecture (before → after)

| Item | Before | After |
|------|--------|-------|
| Route | `app/api/omni-ai/route.ts` SSE, no tools | Tool loop (`fetch_recent_attempts`) + SSE final reply |
| Auth | IP rate limit only | `createClient().auth.getUser()` for marking data |
| Context | `examiner_ink` partial JSON | `marking_result` + full DB-backed attempt block |
| Prompt | Generic tutor | `MARKING_AWARENESS_SECTION` in `lib/omni-ai/system-prompts.ts` |

## Part B.2 — Marking context injection

**Triggers (both):**

1. **Button:** `AskOmniAboutMark` on `MarkingResultView` / `WholePaperResultView` → sets `marking_result` context + opens Omni  
2. **Auto context:** `/mark` after result (`attempt_id`), dashboard attempt page (`OmniAIBridge`), `ChatPanel` sends `attemptId` in POST body  

**Server:** `loadAttemptForOmni` + `formatAttemptForPrompt` — question, OCR answer, mark scheme JSON, full `ai_marking` (including whole-paper `questions[]`).

## Part B.3 — `fetch_recent_attempts` tool

- Schema: `lib/omni-ai/marking-tools.ts`
- Handler: `lib/omni-ai/marking-context.ts` → `fetchRecentAttemptsForUser`
- **Privacy:** `.eq('user_id', userId)` on every query; service role used server-side with explicit user filter (not client-supplied `user_id`). Attempt load uses same pattern — wrong user / ID → no row.

## Part B.4 — Ask Omni CTA

- Component: `components/omni-ai/AskOmniAboutMark.tsx`
- Placement: centered below marking sections on single-question + whole-paper results (small mono link + sparkles icon)

## Part B.5 — System prompt excerpt

See `MARKING_AWARENESS_SECTION` in `lib/omni-ai/system-prompts.ts` (marking results access, cite real marks, no fabrication, use tool when needed).

## Build

```
pnpm build — success (Next.js 16.2.6, TypeScript clean)
```

## Edge cases

- Unauthenticated Omni: no tools, no attempt injection (landing still works).  
- `marking_result` without login: no focused block; model should not invent marks.  
- Whole-paper attempts: `ai_marking` is `WholePaperResult`; formatter iterates all questions.  
- Essay single-question: `band_result` section added; mark-by-mark hidden when `marks_awarded` empty.  
- Tool loop capped at 3 rounds; final response streams without tools to avoid unhandled tool_use in SSE.  

## Optional follow-up

- Wire `?attempt_id=` via `useOmniAttemptQueryParam` on pages that need URL-only deep links (hook added, not mounted everywhere).  
- Migrate `PaperPreview` to `RichTextRenderer` for consistency on question text.
