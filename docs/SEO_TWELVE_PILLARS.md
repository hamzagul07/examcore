# Twelve SEO pillars — MarkScheme implementation map

Production: **https://markscheme.app**

This doc maps each industry SEO pillar to **what is implemented in code** vs **what you run operationally**.

---

## 1. Search intent & content depth

| Intent | Example queries | Page format | Implementation |
|--------|-----------------|-------------|----------------|
| Transactional | mark past paper online | Tool + short copy | `/mark` — `PAGE_SEO_PROFILES` in `lib/seo/intent.ts` |
| Commercial | best Cambridge resources | Comparison list | `best-cambridge-*` posts + `/guides/resources-tools` hub |
| Informational | how to read mark scheme | Step-by-step guide | `how-to-*` posts + HowTo JSON-LD |
| Navigational | MarkScheme pricing | Direct page | `/pricing`, `/about` |

**Depth:** Blog posts use tables, FAQs, and sectioned H2s — not filler word count.  
**AEO lead:** `BlogQuickAnswer` on every article (`components/blog/BlogQuickAnswer.tsx`).

---

## 2. Topical authority (content clusters)

**8 hub pages** under `/guides/[cluster]` — see `lib/seo/clusters.ts`.

| Hub | Pillar article | Money page |
|-----|----------------|------------|
| `/guides/past-paper-marking` | how-to-mark-cambridge-past-papers-yourself | /mark |
| `/guides/mark-schemes` | how-to-read-a-cambridge-mark-scheme | /mark |
| `/guides/subject-guides` | 9709 maths guide | /subjects |
| `/guides/subject-choice` | which A-Levels to take 2026 | /subjects |
| `/guides/exam-integrity` | exam leaks 2026 | /mark |
| `/guides/resources-tools` | best resources 2026 (comparison) | /mark |

Spokes auto-assigned via `slugPatterns`. Internal links: `BlogClusterNav`, footer Resources, homepage `LandingTopicHub`.

---

## 3. Technical foundation

| Asset | File |
|-------|------|
| Sitemap (guides + blog priorities) | `app/sitemap.ts` |
| robots.txt | `app/robots.ts` |
| Canonical URLs | `lib/seo/metadata.ts` → `alternates.canonical` |
| Redirects (legacy URLs) | `next.config.ts` |
| Audit script | `pnpm seo:audit` → `scripts/seo-audit.mjs` |

**You:** GSC → Coverage → fix “Crawled – currently not indexed” URLs.

---

## 4. Core Web Vitals & speed

| Change | File |
|--------|------|
| AVIF/WebP images | `next.config.ts` `images.formats` |
| Lazy images in blog | `components/blog/BlogMarkdown.tsx` |
| Security / HSTS headers | `next.config.ts` |

**You:** GSC → Experience → CWV; defer heavy scripts on marketing routes if LCP regresses.

---

## 5. On-page optimization

| Element | Implementation |
|---------|----------------|
| Title ~50–60 chars | `formatSerpTitle()` in `lib/seo/on-page.ts` |
| Meta 120–160 chars | `formatMetaDescription()` |
| One H1 | `BlogArticleHero` + marketing heroes |
| H2/H3 hierarchy | Markdown + TOC `BlogTableOfContents` |
| URL slugs | Descriptive `/blog/cambridge-9709-…` |
| Image alt | Auto + override in `BlogMarkdown` |

---

## 6. Internal linking & architecture

- **≤3 clicks:** Home → `/guides` → cluster → blog → `/mark`
- **Contextual anchors:** Pillar links in `lib/seo/pillar-links.ts`, cluster nav on posts
- **Related posts:** Same cluster first (`lib/blog.ts` `getRelatedPosts`)
- **Flat nav:** `MARKETING_NAV` includes Guides

---

## 7. Structured data (schema)

| Type | Where |
|------|-------|
| Organization, WebSite, SoftwareApplication | `SiteJsonLd`, `HomeJsonLd` |
| FAQPage | Landing FAQ, blog FAQs (extracted) |
| BlogPosting + Person author | `BlogPostJsonLd` |
| HowTo | how-to format posts |
| ItemList | comparison posts |
| CollectionPage | `/guides` hubs |
| BreadcrumbList | `PageJsonLd`, blog posts |

Validate: [Google Rich Results Test](https://search.google.com/test/rich-results).

---

## 8. Backlinks & off-site authority

**Not automatable.** Playbook: [SEO_AUTHORITY_PLAYBOOK.md](./SEO_AUTHORITY_PLAYBOOK.md).

Linkable assets on-site: comparison guide, 24 syllabus guides, `/mark` free tier.

---

## 9. E-E-A-T

| Signal | Implementation |
|--------|----------------|
| Named author | `lib/seo/authors.ts`, `BlogAuthorByline` |
| About / contact | `/about`, `/contact` + `AboutPersonJsonLd` |
| HTTPS | Vercel + HSTS header |
| Primary sources | `BlogSourcesBlock` on articles |
| Honest claims | About copy, no fake reviews in schema |

---

## 10. UX & engagement

- Scannable prose: `.ec-blog-prose` in `theme.css`
- Mobile header / drawer: `MarketingHeader`, `AppHeader`
- Skip link: root layout `#main-content`
- No intrusive interstitials on marketing
- Reading progress: `BlogReadingProgress`

---

## 11. AI Overviews / GEO (AEO)

- `BlogQuickAnswer` — direct answer above body
- Question-style H3 FAQs under `## Frequently asked questions`
- `public/llms.txt` — machine-readable site summary
- Citation-friendly Sources block

---

## 12. Measure & iterate

| Tool | Doc |
|------|-----|
| GSC striking distance | [SEO_MEASUREMENT.md](./SEO_MEASUREMENT.md) |
| GA4 (optional) | `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `SeoAnalytics` |
| Local audit | `pnpm seo:audit` |

---

## Deploy checklist

1. Deploy to Vercel  
2. Submit sitemap in GSC  
3. Set `GOOGLE_SITE_VERIFICATION`  
4. Run Rich Results Test on one how-to + one comparison post  
5. Request indexing for `/guides` and top 3 hubs  
