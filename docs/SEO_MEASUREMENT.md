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
