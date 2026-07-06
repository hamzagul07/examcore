# SEO measurement & iteration

Pair **Google Search Console** (rankings) with optional **GA4** (`NEXT_PUBLIC_GA_MEASUREMENT_ID`).

## Weekly (15 min)

1. GSC → **Performance** → filter last 28 days  
2. Sort by **impressions** — note queries in positions **5–15** (striking distance)  
3. For each URL in striking distance: tighten title (50–60 chars), meta description (120–160), add FAQ section if missing  
4. GSC → **Pages** → check CTR vs position; rewrite titles where CTR is low  

## Monthly

- Run `pnpm seo:audit` — titles, descriptions, orphan hints  
- Publish **one editorial** post linked from the matching `/guides/*` hub  
- Request indexing for new posts in GSC  
- Review **Core Web Vitals** in GSC → Experience  

## Striking distance worksheet

| Query | Page | Position | Impressions | Action |
|-------|------|----------|-------------|--------|
| cambridge past paper marking | /mark | 8 | — | Add FAQ block, internal links from /guides/past-paper-marking |
| 9709 past papers | /blog/cambridge-9709-… | 11 | — | Refresh date, link from /subjects |
| … | … | … | … | … |

## Prune / consolidate

- Merge thin posts targeting the same query into one pillar  
- `noindex` only for true duplicates (auth, dashboard) — already in `robots.ts`  
- Do not delete subject guides without 301 to the surviving slug  

## AI visibility (GEO)

Track referrals from ChatGPT / Perplexity in GA4 if UTM present. Optimize posts with **Quick answer** blocks and **Sources** — already on blog template.

## Results week 2026 — GSC re-index (do after deploy)

GSC → **URL Inspection** → **Request indexing** (batch over 2–3 days; ~10–15/day avoids throttling).

### Tier 1 — hubs & season anchors

| URL |
|-----|
| `https://markscheme.app/` |
| `https://markscheme.app/guides/grade-boundaries` |
| `https://markscheme.app/blog/cambridge-post-exam-results-prep-2026` |
| `https://markscheme.app/blog/cambridge-may-june-2026-grade-thresholds-what-to-expect` |
| `https://markscheme.app/blog/cambridge-results-day-august-2026-guide` |
| `https://markscheme.app/tools/grade-boundary-calculator` |

### Tier 2 — upgraded boundary guides (A-Level)

`/blog/cambridge-9709-mathematics-grade-boundaries-2026` · `9700-biology` · `9701-chemistry` · `9702-physics` · `9708-economics` · `9609-business` · `9990-psychology` · `9489-history` · `9696-geography` · `9699-sociology` · `9706-accounting` · `9084-law` · `9618-computer-science` · `9607-media-studies` · `9231-further-mathematics` · `9488-islamic-studies` · `9695-literature-in-english`

### Tier 3 — O-Level / IGCSE boundaries (grades **18 Aug**)

`/blog/cambridge-4024-mathematics-grade-boundaries-2026` · `0580-mathematics` · `0990-first-language-english` · `0610-biology` · `0620-chemistry` · `0625-physics` · `2281-economics` · `7115-business-studies` · `4037-additional-mathematics` · `2210-computer-science` · `5090-biology` · `5070-chemistry` · `5054-physics` · `7707-accounting` · `0460-geography`

**Calculator coverage (Jul 2026):** all **32** `*-grade-boundaries-2026` guides have verified June 2024/2023 component JSON — ingest June 2026 via `pnpm grade:thresholds:ingest` after ~13 Aug.

### Tier 4 — most-repeated revision hubs

`/blog/most-repeated-cambridge-science-past-paper-topics-2026` and each sibling (economics, history, maths, English, business, psychology, sociology, geography, accounting, law, media studies, Islamic studies).

### After ~13 August

Re-request Tier 2 + calculator hub when June 2026 threshold PDFs are ingested (`pnpm grade:thresholds:ingest`).

## IB results week (early July) — GSC re-index

Peak demand **1–15 July** for May session results. Request indexing for:

| URL |
|-----|
| `https://markscheme.app/` |
| `https://markscheme.app/ib` |
| `https://markscheme.app/guides/ib` |
| `https://markscheme.app/blog/ib-results-day-2026-what-to-expect` |
| `https://markscheme.app/blog/ib-post-exam-results-prep-2026` |
| `https://markscheme.app/blog/ib-grade-boundaries-explained` |
| `https://markscheme.app/blog/ib-how-to-build-a-grade-7-buffer-2026` |
| `https://markscheme.app/blog/ib-predicted-grades-explained` |
| `https://markscheme.app/ib/past-papers` |
| `https://markscheme.app/ib/courses` |

## Barnacle / Reddit (manual, same window)

Use [BARNACLE_SEO_PLAYBOOK.md](./BARNACLE_SEO_PLAYBOOK.md) — 2–3 genuine replies/week on r/IBO (July) and r/igcse / r/alevel (August). Track `utm_medium=barnacle` in GA4.
