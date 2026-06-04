# Advanced SEO (13 pillars) — MarkScheme

Maps advanced tactics to **code** vs **your ongoing ops**.

---

## 1. Entity SEO & Knowledge Graph

**In repo:**
- `lib/seo/entity.ts` — brand NAP, `sameAs` env vars
- `EntityGraphJsonLd` — Organization, Brand, Person, WebSite, SoftwareApplication on every page

**Vercel env (optional but recommended):**
```
NEXT_PUBLIC_WIKIDATA_ENTITY_URL=https://www.wikidata.org/wiki/Q…
NEXT_PUBLIC_TWITTER_URL=
NEXT_PUBLIC_LINKEDIN_URL=
NEXT_PUBLIC_FOUNDER_LINKEDIN_URL=
```

**You:** Create/maintain Wikidata item; keep social URLs consistent; same brand name everywhere.

---

## 2. Click satisfaction (NavBoost)

**In repo:**
- `BlogTaskCompleteCta` — completes task on `/mark` without returning to SERP
- `formatSerpTitle` / `formatMetaDescription` for CTR-friendly metadata

**You:** In GSC, export queries at positions 4–15; A/B title tests in metadata/frontmatter monthly.

---

## 3. Branded search demand

**Not in repo** — PR, TikTok, student communities, “MarkScheme” in bios. See `SEO_AUTHORITY_PLAYBOOK.md`.

---

## 4. Internal PageRank sculpting

**In repo:**
- `lib/seo/internal-sculpt.ts` — sculpted footer links to hubs + `/mark`
- Subject grid → `/subjects/[code]` (24 programmatic pages)
- Clusters at `/guides/*`

**You:** Run Screaming Frog periodically; avoid adding footer links to `/join`, auth, etc.

---

## 5. Programmatic SEO

**In repo:**
- `/subjects/[code]` — one page per marking-enabled syllabus (unique copy, FAQ, LearningResource schema)
- `/compare` — commercial comparison table
- Blog subject guides (24 long-form)

**Quality gate:** Each subject page links to deep blog guide; no duplicate full text.

---

## 6. SERP feature engineering

**In repo:**
- `BlogSerpSnippets` — 40–60 word answers under `###` questions (excludes FAQ section)
- FAQ schema from markdown + subject page FAQs
- Tables on `/compare`

---

## 7. Semantic completeness

**In repo:**
- `lib/seo/semantic-topics.ts` — entity checklist per cluster

**You:** When refreshing a post, tick off missing entities as new H2 sections.

---

## 8. Content decay

**In repo:** `pnpm seo:decay` → `scripts/seo-decay.mjs`

**You:** Refresh stale posts; add `updated: YYYY-MM-DD` in frontmatter; re-request indexing in GSC.

---

## 9. Cannibalization

**In repo:** `pnpm seo:cannibalization`

**You:** Merge overlapping posts or point weaker URL to pillar with canonical/301.

---

## 10. Log files & crawl budget

**You (Vercel):** Use Vercel Log Drains or edge logs; block low-value paths in `robots.ts` (already blocks `/api`, `/dashboard`, etc.).

---

## 11. SSR / rendering

**In repo:** Marketing + blog + guides are **SSG** (server HTML).  
**Check:** `BASE_URL=https://markscheme.app pnpm seo:ssr-check`

**You:** GSC URL Inspection → “View crawled page” → confirm main content in HTML.

---

## 12. Digital PR + reclamation

**In repo:**
- `/research` — citable methodology page for press/links
- `/llms-full.txt` — full URL index for AI crawlers

**You:** Pitch methodology page; use Ahrefs/GA for unlinked mentions → ask for link.

---

## 13. Advanced GEO / LLM citation

**In repo:**
- `BlogQuickAnswer`, `data-chunk-id` on FAQ/snippet blocks
- `public/llms.txt` + dynamic `https://markscheme.app/llms-full.txt`
- Entity graph with `knowsAbout` / Person author

**You:** Get cited on Reddit/Discord/YouTube with consistent “MarkScheme” + link to specific guide.

---

## Commands

```bash
pnpm seo:audit
pnpm seo:decay
pnpm seo:cannibalization
BASE_URL=https://markscheme.app pnpm seo:ssr-check
```
