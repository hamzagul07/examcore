# SEO & domain authority playbook (MarkScheme)

Production: **https://markscheme.app**

Technical SEO in the repo is strong (sitemap, robots, JSON-LD, ~70+ blog URLs, RSS, `llms.txt`, pillar internal links). **Rankings and Domain Authority (DA) still depend on off-page signals, time, and Search Console — no codebase can guarantee #1 positions.**

## What we already ship (on-page)

| Asset | Purpose |
|-------|---------|
| `/sitemap.xml` | Prioritised URLs (blog spotlight/editorial higher) |
| `/robots.txt` | Allow marketing + blog; block app/auth |
| `/feed.xml` | RSS for crawlers and aggregators |
| `/llms.txt` | LLM/crawler summary of site |
| JSON-LD | Organization, WebSite, FAQ, BlogPosting, breadcrumbs |
| Blog hub | Editorial + 24 syllabus guides + internal pillar links |
| Footer Resources | Distributes internal PageRank to money pages |

## Week 1 — indexing (do this first)

1. **Google Search Console** — add property `https://markscheme.app`, verify via DNS or HTML tag.
   - Env on Vercel: `GOOGLE_SITE_VERIFICATION=<meta content value>`
2. Submit sitemap: `https://markscheme.app/sitemap.xml`
3. **Bing Webmaster Tools** — same sitemap; env: `BING_SITE_VERIFICATION` — see [BING_WEBMASTER.md](./BING_WEBMASTER.md)
4. Request indexing for: `/`, `/mark`, `/blog`, top 5 editorial posts (URL inspection → Request indexing)
5. Confirm `NEXT_PUBLIC_SITE_URL=https://markscheme.app` on production

## Week 2–4 — E-E-A-T & trust

- Add real **About** story (founder, why built) — already on `/about`; link from blog author blocks if you add them later
- **Contact** page live with fast replies (builds trust signals)
- Optional env for schema `sameAs`: `NEXT_PUBLIC_TWITTER_URL`, `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_YOUTUBE_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL` (defaults ship for [Instagram](https://www.instagram.com/markscheme.app) + [TikTok](https://www.tiktok.com/@markscheme))
- **Privacy / Terms** accurate and dated
- No fake reviews in schema; use honest FAQ content only

## Ongoing — content (biggest lever you control)

- Publish **1 editorial post / month** on timely Cambridge topics (exam series, subject choice, integrity — not leak how-tos)
- Refresh **May/June** and **October/November** season posts each series
- Interlink new posts → `/mark`, `/subjects`, and 2–3 related guides (see `lib/seo/pillar-links.ts`)
- Share posts in **student communities** (Reddit r/IBO, r/igcse, r/alevel, Discord study servers) — genuine help, not spam  
- Results season: follow [BARNACLE_SEO_PLAYBOOK.md](./BARNACLE_SEO_PLAYBOOK.md) (templates + UTM links)

## Off-page — backlinks (DA)

DA rises when reputable sites link to you. Prioritised tactics:

| Tactic | Example |
|--------|---------|
| Student resource lists | Ask to be listed on school revision pages / student blogs |
| YouTube / TikTok creators | Demo “mark my paper in 30s” with link in description |
| Guest posts | Write for education newsletters (Cambridge-focused) |
| HARO / journalist queries | “AI in education”, “exam prep tools” |
| Product directories | Indie Hackers, BetaList, education tool roundups |
| Partnerships | Tutors who recommend MarkScheme to students |

One link from a **relevant** education site beats fifty low-quality directory links.

## Social & brand search

- Consistent handle: **MarkScheme** everywhere
- Live profiles: [Instagram](https://www.instagram.com/markscheme.app) (~110k), [TikTok](https://www.tiktok.com/@markscheme) (~120k) — linked in footer + `Organization.sameAs`
- Bio copy + link order: [SOCIAL_BIOS.md](./SOCIAL_BIOS.md)
- `NEXT_PUBLIC_TWITTER_HANDLE` for Twitter cards
- Branded searches (“MarkScheme past papers”) help Google trust the entity — talk about the product in posts and bios
- **When shipping features:** keep `public/llms.txt`, `lib/seo/page-meta.ts`, and pillar blogs in sync — [GEO_SYNC_CHECKLIST.md](./GEO_SYNC_CHECKLIST.md)

## Metrics to watch (Search Console)

- **Impressions / clicks** for queries: `cambridge past papers`, `mark scheme`, `9709 past papers`, `self marking`
- **Average position** on `/blog/*` guides vs `/mark`
- **Coverage** — fix any “Excluded” or “Crawled not indexed” URLs
- **Core Web Vitals** — keep LCP good on mobile blog (already optimised prose)

## What not to do

- Buy backlinks or use PBNs (Google penalty risk)
- Publish leak papers or instructions to obtain leaked exams
- Keyword-stuff hidden text or duplicate city pages
- Fake aggregate ratings in JSON-LD

## After deploy

```bash
BASE_URL=https://markscheme.app pnpm smoke:preflight
```

Re-run after each deploy; confirm `/sitemap.xml`, `/robots.txt`, `/feed.xml`, and sample blog URLs return 200.

## Realistic timeline

| Milestone | Typical timeframe |
|-----------|-------------------|
| Pages discovered | Days–2 weeks after GSC |
| Long-tail blog traffic | 1–3 months |
| Competitive head terms | 6–18+ months with content + links |
| DA movement (Moz/Ahrefs) | Months of consistent link earning |

Code gives you a **crawlable, trustworthy foundation**. **Search Console + content + backlinks** determine how high you rank.
