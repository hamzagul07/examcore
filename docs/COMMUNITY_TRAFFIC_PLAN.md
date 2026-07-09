# Community Platform → Traffic Engine: Plan & Status

**Goal:** Maximum organic traffic ASAP by lighting up the (already-built) community
platform, pre-seeding it with model-answer pages, and distributing it where IB/Cambridge
students gather. Reads fully open; aggressive AI-seed (clearly labeled); full platform.

**Branch:** `community-model-answers` (recreated after a working-tree reset from unrelated
git ops; the seeded DB content was never affected).

---

## Headline finding

The community platform was **already ~80% built and shipped dark** behind a feature flag.
This is not a greenfield build — the path is **complete → seed → flip on → distribute**.

- 13 `community_*` tables live (migrations `community_reddit/exam_room/seed/notifications/
  thread_notifications` all applied). Reddit-style posts/comments/votes + hot-rank +
  full-text search + a Q&A structure (`community_questions` + `community_answers`).
- Routes exist: `/community`, `/community/s/[subject]`, `/community/questions/[id]`, etc.
  Nav entry + `/community/s/{id}` sitemap wiring already present.
- RLS already allows anonymous reads of `status='published'` → open reads work today.
- Writes go through the server via `createServiceClient()` (bypasses RLS); helpers
  `lib/community/qa.ts` (`createQuestion/createAnswer/acceptAnswer`) and the idempotent
  `lib/community/ensure-seed.ts` are the established patterns.
- Flag: `COMMUNITY_ENABLED` (server) / `NEXT_PUBLIC_COMMUNITY_ENABLED` (client), both off.

**Data reality (important):** `mark_schemes` = **3,413 rows, all Cambridge**, zero IB.
IB has no official per-question markschemes yet (the known IB data gap). So official-quality
model answers can only be generated for **Cambridge** today; IB is a separate data-sourcing
track (or derived schemes, clearly labeled).

---

## What's built (this effort)

### Seed generator — `scripts/seed-community/generate-model-answers.mjs`
For each Cambridge question with an official markscheme, generates a full-marks worked
exemplar + per-mark examiner breakdown (grounded in the official scheme) via Gemini Pro,
and publishes it as a `community_questions` + accepted `community_answers` pair, authored by
the **MarkScheme Model Answers** bot (`markscheme_answers`, id `a1000004-…-004`).

Reuses: `generateGeminiText` (task `content-generation` → JSON mode), `GEMINI_PRO_MODEL`,
`extractJSON`. Env loaded from `.env.local` (mirrors `scripts/gemini-smoke.mjs`).

Safeguards (all validated in practice):
- **Dry-run by default**; `--run` inserts. `--limit N`.
- **Figure/table pre-filter** — skips questions depending on a diagram/table not in the text.
- **Quality gate** — rejects answers < 400 chars or with < 2 mark-breakdown items.
- **Idempotent** — deterministic ids; re-runs skip already-generated questions.
- **FK-safe insert** — question → answer → link `accepted_answer_id`.
- Point-based subjects only (9709/9700/9702/9701/9708) for clean per-mark breakdowns.

Usage:
```
npx tsx scripts/seed-community/generate-model-answers.mjs --limit 3      # dry-run sample
npx tsx scripts/seed-community/generate-model-answers.mjs --run --limit 150   # insert
```

### SEO wiring
- `components/seo/CommunityQaJsonLd.tsx` — `QAPage` JSON-LD (question + accepted/suggested
  answers), rendered on the thread page. **Verified rendering** (`"@type":"QAPage"` +
  `acceptedAnswer` present in HTML).
- `app/(marketing)/community/questions/[id]/page.tsx` — renders the JSON-LD (metadata
  already existed).
- `app/sitemap.ts` — now async; enumerates published `/community/questions/*` threads via
  `listPublishedQuestionRefs()` (in `lib/community/qa.ts`). **Flag-gated**: no DB query
  while the community is dark, so the sitemap is unchanged until launch.

---

## Live content (in Supabase, dark behind the flag)

~110 Cambridge model-answer pages across all 5 subjects (Maths, Biology, Physics,
Chemistry, Economics), authored by `markscheme_answers`. Quality is publish-worthy: correct
working, real mark codes (M1/A1/DM1/B1), specific common mistakes, examiner tips. Verified
across both symbolic (maths) and prose (biology) subjects. 3 table-dependent pages were
pruned during QA.

---

## ⚠️ Biggest risk: scaled-content-abuse penalty

500 careless AI pages can penalize the whole domain. Mitigations (in force):
1. Genuine utility — real question + official-markscheme-grounded answer + unique
   examiner annotations. Not templated spin.
2. Clear labeling — every page marked AI-generated + reviewed; authored by a branded account.
3. Human QA a sample before scaling; the quality gate + figure/table filter enforce a floor.
4. Staggered publish in waves; interleave with real UGC once posting opens.
5. Cambridge only (accuracy). IB held until markschemes exist. See the IB data gap above.

---

## Remaining steps

1. **Finish scale run** — generator running toward ~110 pages (let complete).
2. **Flip the flag** — set `COMMUNITY_ENABLED=true` + `NEXT_PUBLIC_COMMUNITY_ENABLED=true`
   in production, redeploy. This launches the whole community (model answers + the 47
   existing discussion posts + nav + thread sitemap URLs).
3. **Submit sitemap** to Google Search Console; request indexing of key threads.
4. **Distribute** — r/IBO + subject Discords, share cards, blog internal links.
5. **Open posting** — moderation already exists (`screenContribution` AI pre-screen,
   `community_reports`, `needs_edit/flagged` statuses); confirm rate-limits before launch.

## Open items
- **Board scope beyond Cambridge:** IB needs a markscheme-ingestion project first.
- **Slugs:** threads are UUID-based; keyword slugs would improve ranking/shareability (v2).
- **Marking-engine overlay:** v2 can run the exemplar back through `markSingleQuestion` for
  an annotated, positioned breakdown instead of a text breakdown.
