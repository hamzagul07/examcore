# Information gain & AI retrieval (12 pillars)

MarkScheme implementation map — adapted to **Cambridge marking**, not generic SaaS datasets.

---

## 1. Information gain (not derivative SEO)

**Code:**
- `BlogInformationGain` — labels first-hand / synthesis / dataset content
- `/insights` — **original benchmark dataset** (`data/seo/marking-insights.json`) with **Dataset** schema
- Frontmatter: `informationGain: first-hand | synthesis | dataset | editorial`

**You:** Add novel angles (founder marking sessions, 2026 series specifics). Avoid rephrasing competitor guides.

---

## 2. Query fan-out & chunk retrieval

**Code:**
- `BlogChunkedArticle` — each `##` section = self-contained chunk
- `data-chunk-id`, `data-sub-intent` on sections
- Entity-rich **lead sentence** per chunk (`lib/seo/fan-out.ts`)
- `pnpm seo:fan-out-lint`

**You:** Every H2 answers **one** sub-intent; 40+ words per section.

---

## 3. Proprietary data moat

**Code:** `/insights` + Dataset JSON-LD + citable table

**You:** Refresh `data/seo/marking-insights.json` when you have real anonymized product aggregates. Pitch `/insights` for digital PR links.

---

## 4. Barnacle SEO (UGC surfaces)

**Not automated** — Google penalizes spam. Playbook:

| Surface | Action |
|---------|--------|
| r/igcse, r/alevel | Answer with genuine marking tips; link only when helpful |
| YouTube | Short demos “mark my 9709 Q4” |
| LinkedIn | Founder posts on scheme literacy |

See `docs/BARNACLE_SEO_PLAYBOOK.md`.

---

## 5. Reasonable Surfer link placement

**Code:**
- `BlogInContentLinks` — prominent in-content CTAs (not footer)
- Footer sculpted (`internal-sculpt.ts`) — fewer boilerplate links

---

## 6. Indexing tiers & freshness

**Code:**
- Sitemap priorities (spotlight > guides > subjects)
- `updated` frontmatter → `dateModified` schema
- `pnpm seo:decay` for stale posts

**You:** Internal link from homepage/blog to pages you need recrawled weekly.

---

## 7. Sitewide quality defense

**Code:** `pnpm seo:sitewide-quality` — no footer links to `/join`, auth

**You:** Consolidate cannibalizing posts (`pnpm seo:cannibalization`); noindex true duplicates only.

---

## 8. Known by models (parametric knowledge)

**Code:**
- Consistent **MarkScheme** entity graph (`buildSiteGraph`)
- `llms.txt` + `/llms-full.txt`
- `NEXT_PUBLIC_WIKIDATA_ENTITY_URL`

**You:** Same brand description on Reddit, YouTube, directories, press.

---

## 9. Deep nested @graph JSON-LD

**Code:**
- `buildSiteGraph()` / `buildBlogPostGraph()` — `@id` cross-refs Organization ↔ Brand ↔ Person ↔ WebPage ↔ Article ↔ FAQ

---

## 10. Conversational follow-up chain

**Code:** `BlogFollowUpChain` + `lib/seo/follow-up-chain.ts` per cluster

**You:** Extend chains when you see new AI follow-up questions in GSC/Reddit.

---

## 11. Real sub-query language

**Code:** `BlogConversationalQueries` + `lib/seo/conversational-queries.ts`

**You:** Quarterly mine Reddit/forums; add phrases to the file.

---

## 12. AI visibility measurement

**Code:** `pnpm seo:ai-visibility` → `docs/generated/ai-visibility-checklist.md`

**You:** Monthly manual check — cite share in ChatGPT, Perplexity, AI Overviews.

---

## Commands

```bash
pnpm seo:fan-out-lint
pnpm seo:ai-visibility
pnpm seo:sitewide-quality
pnpm seo:decay
```

Deploy then request indexing: `/insights`, top blog posts with new chunk layout.
