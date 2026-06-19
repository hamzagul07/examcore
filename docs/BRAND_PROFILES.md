# MarkScheme — brand profile copy (Crunchbase + LinkedIn)

Entity confidence in Google's Knowledge Graph and AI answer engines comes from the
**same facts, worded consistently, cross-linked** across profiles. Copy these verbatim
so Wikidata, Crunchbase, LinkedIn and the site (`lib/seo/entity.ts` → `BRAND_ENTITY`)
all reinforce one entity. Then point each profile's URL back via the `sameAs` env vars.

> Fill the `[bracketed]` fields with real, consistent values (use the **same** HQ
> location and founding year on every profile — that consistency is the signal).

---

## 0. Canonical facts (single source of truth — must match everywhere)

| Field | Value |
|---|---|
| Name | **MarkScheme** |
| Website | https://markscheme.app |
| Email | hello@markscheme.app |
| One-liner | Cambridge International A-Level and O-Level past-paper marking against real mark schemes. |
| Category | Education / EdTech / Exam preparation |
| HQ location | `[City, Country]` — pick one and use it on all profiles |
| Founded | `[year]` |
| Founder | Hassan |

---

## 1. Crunchbase

**Fields**
- **Organization name:** MarkScheme
- **Website:** https://markscheme.app
- **Industries:** Education, EdTech, Test & Exam Preparation, Artificial Intelligence, SaaS
- **Operating status:** Active
- **Founded date:** `[year]`
- **Headquarters:** `[City, Country]`
- **Contact email:** hello@markscheme.app
- **Social:** add LinkedIn + any X/YouTube/Instagram (must match the `sameAs` env vars)

**Short description (≤140 chars):**
> MarkScheme marks Cambridge International A-Level & O-Level past papers from your handwriting, using the real mark schemes.

**Full description:**
> MarkScheme is an exam-marking tool for Cambridge International students. Upload a photo of your handwritten answers — or a whole past paper — and get mark-by-mark feedback scored against the official Cambridge mark scheme: method and accuracy marks (B1/M1/A1) for maths and sciences, level-of-response band descriptors for essays, answer keys for multiple choice, and whole-paper summaries.
>
> Unlike generic AI essay graders, MarkScheme is built around the actual Cambridge syllabuses and mark schemes for 24+ A-Level and O-Level subjects, so feedback reflects how an examiner would award marks — not a vague AI grade.
>
> Alongside marking, MarkScheme publishes free topic-by-topic courses, past-paper libraries, grade-boundary tools and revision guides for Cambridge students worldwide. Founded by an A-Level student who marked hundreds of past papers by hand, it's built from real revision sessions. Start free at https://markscheme.app.

---

## 2. LinkedIn (Company Page)

**Fields**
- **Name:** MarkScheme
- **Tagline (≤120 chars):**
  > Mark Cambridge A-Level & O-Level past papers from your handwriting — using the real mark schemes.
- **Website:** https://markscheme.app
- **Industry:** E-Learning Providers (or "Education")
- **Company size:** `[1-10]`
- **Headquarters:** `[City, Country]`
- **Founded:** `[year]`
- **Specialties:** Cambridge International, A-Level, O-Level, past papers, mark schemes, exam preparation, AI marking, revision, assessment, EdTech

**About (overview):**
> MarkScheme marks Cambridge International past papers the way an examiner would — from your own handwriting.
>
> Students upload a photo of their handwritten answers, or a whole past paper, and get mark-by-mark feedback scored against the official Cambridge mark scheme: method and accuracy marks (B1/M1/A1) for maths and sciences, level-of-response band descriptors for essays, answer keys for multiple choice, and whole-paper summaries.
>
> It's built around the real Cambridge syllabuses and mark schemes for 24+ A-Level and O-Level subjects — not generic AI essay grading — so feedback shows exactly where marks are won and lost.
>
> Beyond marking, MarkScheme offers free topic-by-topic courses, past-paper libraries, grade-boundary tools and revision guides for Cambridge students worldwide.
>
> Founded by an A-Level student who marked hundreds of past papers by hand, MarkScheme is built from real revision sessions — not filler. Start free at https://markscheme.app.

---

## 3. Wire-back + consistency checklist

After creating each profile, set the matching deploy env vars (already consumed by
`getBrandSameAs()` / `getFounderSameAs()` in `lib/seo/entity.ts`):

```
NEXT_PUBLIC_LINKEDIN_URL=https://www.linkedin.com/company/<slug>/
NEXT_PUBLIC_FOUNDER_LINKEDIN_URL=https://www.linkedin.com/in/<founder>/
NEXT_PUBLIC_TWITTER_URL=https://x.com/<handle>          # if created
NEXT_PUBLIC_YOUTUBE_URL=https://youtube.com/@<handle>   # if created
NEXT_PUBLIC_WIKIDATA_ENTITY_URL=https://www.wikidata.org/wiki/Q…  # see WIKIDATA_ENTITY.md
```

Consistency checklist (the actual ranking signal):
- [ ] Exact same brand name "MarkScheme" everywhere (no "Mark Scheme" / "Markscheme.app")
- [ ] Same one-liner + same HQ location + same founding year on every profile
- [ ] Every profile links to https://markscheme.app
- [ ] Each profile is added to the site's `sameAs` via the env vars above
- [ ] Crunchbase ↔ LinkedIn ↔ Wikidata cross-reference each other where possible
- [ ] Re-index the homepage in Search Console after the `sameAs` list grows
