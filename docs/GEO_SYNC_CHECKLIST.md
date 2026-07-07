# GEO & SEO sync checklist

When you ship a **new feature, subject, course track, or major page**, update the files below so Google, Perplexity, and ChatGPT (with search) can cite MarkScheme consistently.

> Run `pnpm seo:ai-visibility` after changing query targets.  
> Run `pnpm seo:fan-out-lint` after editing blog chunk structure.

---

## File map (what each file does)

| File | Purpose | Update when |
|------|---------|-------------|
| `public/llms.txt` | Machine-readable product summary + keyword phrases for AI crawlers | New product area, money pages, or GEO head terms |
| `app/llms-full.txt/route.ts` | Auto URL index for RAG crawlers | Usually auto ? only edit intro copy if positioning changes |
| `lib/seo/page-meta.ts` | Titles and meta descriptions (SERP + AI snippets) | New marketing route or changed value prop |
| `lib/seo/keywords.ts` | `PAGE_KEYWORDS` + `KEYWORD_CLUSTERS` | New route, new intent cluster, competitor phrases |
| `lib/seo/llms-geo-qa.ts` | Shared Q&A pairs + category phrases | New GEO head questions |
| `lib/seo/llms-document.ts` | Static llms.txt body (guides, keywords) | New money pages or pillar links |
| `scripts/generate-llms-txt.mjs` | Writes `public/llms.txt` from code | After editing llms-document or GEO Q&A |
| `lib/seo/marking-how-to.ts` | HowTo steps for `/mark` and `/how-it-works` | Marking workflow change |
| `lib/seo/compare-seo.ts` | `/compare` FAQ copy | Comparison table change |
| `components/seo/HomeGeoIntro.tsx` | Homepage crawler blurb | Homepage positioning |
| `components/seo/MarkSeoIntro.tsx` | `/mark` SSR intro + FAQ | Marking GEO copy |
| `scripts/seo-indexnow.mjs` | Ping Bing/Yandex after deploy | Major GEO release |
| `lib/seo/conversational-queries.ts` | UGC-style phrases for fan-out / GEO retrieval | New questions in Reddit, Perplexity, or GSC |
| `lib/seo/clusters.ts` | Guide hub routing + pillar blog slugs | New blog cluster or pillar post |
| `lib/seo/entity.ts` | `Organization.sameAs` + `BRAND_ENTITY` | New social / Crunchbase / Wikidata URL |
| `lib/site-nav.ts` | Footer social + nav links | New public profile or top-level section |
| `app/(marketing)/compare/page.tsx` | Honest comparison tables (GEO list answers) | New competitor category or product capability |
| `app/(marketing)/research/page.tsx` | Press kit / citable facts | Stats, product scope, or boilerplate change |
| `scripts/seo-ai-visibility.mjs` | Regenerates AI visibility test queries | New head GEO queries to track monthly |
| `scripts/seo-quick-answer-lint.mjs` | CI: pillar posts must have `## Quick answer` | New pillar slug added to script |
| `scripts/seo-geo-sync-check.mjs` | CI: `llms.txt` + entity copy sanity | GEO positioning change |
| `docs/SEO-KEYWORDS.md` | Human keyword research notes | New priority cluster or pillar slug |
| `docs/generated/ai-visibility-checklist.md` | Generated ? run `pnpm seo:ai-visibility` | After editing the script above |

---

## Checklist by change type

### New product feature (e.g. new marking mode, tool, community area)

- [ ] `lib/seo/page-meta.ts` ? title + description on the feature page
- [ ] `lib/seo/keywords.ts` ? `PAGE_KEYWORDS` for that route
- [ ] `public/llms.txt` ? add under **Primary pages**, **Keywords**, and **Common questions (GEO)**
- [ ] `app/(marketing)/compare/page.tsx` ? if it changes how you compare vs tutors / Save My Exams / ChatGPT
- [ ] `lib/seo/conversational-queries.ts` ? 2?3 natural-language questions students ask
- [ ] One blog post or FAQ section with **`## Quick answer`** naming MarkScheme + link
- [ ] Add slug to `scripts/seo-quick-answer-lint.mjs` if it is a pillar post
- [ ] Featured editorials (`featured: true`) must include `## Quick answer` (enforced in CI)
- [ ] `scripts/seo-ai-visibility.mjs` ? add a test query, then `pnpm seo:ai-visibility`

### New Cambridge subject or past-paper hub

- [ ] Subject page metadata (usually auto via `subjects/[code]`)
- [ ] Blog guide if missing: `content/blog/cambridge-{code}-*-past-papers-guide.md`
- [ ] `public/llms.txt` ? only if flagship subject (9709, 9702, etc.)
- [ ] `lib/seo/clusters.ts` ? `subject-guides` patterns if new slug shape

### New IB course or subject

- [ ] `app/(marketing)/ib/page.tsx` / `ib/courses` metadata if catalog blurb changes
- [ ] `public/llms.txt` ? **IB Diploma guides** or **Free IB courses** section
- [ ] `lib/seo/keywords.ts` ? `/ib`, `/ib/courses`, `/guides/ib`
- [ ] IB blog guide or update `ib-free-courses-guide.md`
- [ ] `lib/seo/conversational-queries.ts` ? IB phrases (`best free ib?`, `mark ib?`)

### New social profile

- [ ] `lib/seo/entity.ts` ? `DEFAULT_BRAND_*` or env override
- [ ] `lib/site-nav.ts` ? `FOOTER_SOCIAL_LINKS`
- [ ] `components/layout/SiteFooter.tsx` ? icon if new platform
- [ ] `.env.example` ? `NEXT_PUBLIC_*_URL` comment
- [ ] `docs/BRAND_PROFILES.md` ? wire-back env block

### New pillar / listicle blog post

- [ ] Frontmatter: `keywords`, `informationGain`, `updated`
- [ ] **`## Quick answer`** as first H2 (40?80 words, brand + URL)
- [ ] `lib/seo/clusters.ts` ? `pillarBlogSlug` or `slugPatterns` if new cluster
- [ ] `public/llms.txt` ? link under **High-value guides** if top-10 money content
- [ ] Internal links to `/mark`, `/courses`, `/ib/courses`, `/compare`
- [ ] Add slug to `scripts/seo-quick-answer-lint.mjs`

---

## GEO copy rules

1. **Brand + domain together** ? "MarkScheme (markscheme.app)" in Quick answer blocks.
2. **Both tracks** ? mention Cambridge **and** IB on homepage, `/mark`, and combined listicles unless page is single-track.
3. **Extractable answers** ? every pillar post starts with `## Quick answer`; one sentence = one citation candidate.
4. **Honest comparisons** ? name Save My Exams, PMT, ZNotes, Revision Village where relevant; link to `/compare`.
5. **No keyword stuffing** ? phrases in `llms.txt` Keywords section are comma-separated intents, not a paragraph.
6. **Category phrase** ? use "second-pass marking" and "scheme-aligned" in press copy (`/research`).

---

## Commands

```bash
pnpm seo:ai-visibility      # refresh Perplexity test worksheet
pnpm seo:quick-answer-lint  # pillar posts must have ## Quick answer
pnpm seo:generate-llms      # regenerate public/llms.txt from code
pnpm seo:geo-sync-check     # llms.txt + entity.ts sync (runs generate-llms first)
pnpm seo:fan-out-lint       # blog chunk / sub-intent lint
pnpm seo:audit              # titles, orphans
BASE_URL=https://markscheme.app pnpm seo:sitemap-scan
```

---

## Pillar URLs (keep cited in AI answers)

| Intent | Canonical URL |
|--------|----------------|
| Mark papers (product) | https://markscheme.app/mark |
| Cambridge + IB tools list | /blog/best-online-tools-cambridge-ib-marking-courses-2026 |
| Free Cambridge resources | /blog/best-free-cambridge-revision-resources-2026 |
| Free IB resources | /blog/best-free-ib-revision-resources-2026 |
| Compare options | /compare |
| Free IB courses | /blog/ib-free-courses-guide |
| Free Cambridge courses | /courses |
| AI marking Cambridge | /blog/ai-marking-cambridge-past-papers-guide |
| AI marking IB | /blog/ai-marking-ib-past-papers-guide |
| Press / facts | /research |
| Product updates | /changelog |
| Teachers & schools | /for-teachers |
| Proprietary data | /insights |

---

## Manual (you do after deploy)

- [x] Wikidata item [Q140455387](https://www.wikidata.org/wiki/Q140455387) + `NEXT_PUBLIC_WIKIDATA_ENTITY_URL` (optional � ships as code default)
- [x] IndexNow key + `pnpm seo:indexnow` after deploy � see [BING_WEBMASTER.md](./BING_WEBMASTER.md)
- [ ] Bing Webmaster Tools � verify site + submit sitemap ([BING_WEBMASTER.md](./BING_WEBMASTER.md))
- [ ] IG/TikTok bio link tree to `/mark`, `/ib/courses`, `/compare` � [SOCIAL_BIOS.md](./SOCIAL_BIOS.md)
- [ ] 10 external listicle / school resource page mentions � [OUTREACH_LISTICLE.md](./OUTREACH_LISTICLE.md) � track in [OUTREACH_TRACKER.md](./OUTREACH_TRACKER.md)
- [ ] Monthly Perplexity checklist (`docs/generated/ai-visibility-checklist.md`)
- [x] Companion blog + transcript for top TikTok demos — [TIKTOK_BLOG_COMPANION.md](./TIKTOK_BLOG_COMPANION.md) (6/6 live)
