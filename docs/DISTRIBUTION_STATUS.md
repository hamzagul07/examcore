# GEO distribution status (MarkScheme)

Last updated: 2026-07-07. Production: **https://markscheme.app**

---

## Done in code (shipped)

| Area | Status |
|------|--------|
| `llms.txt` + auto-generate | Live |
| Wikidata Q140455387 in schema + llms | Live |
| IndexNow (25 priority URLs) | Live |
| GEO pages (`/compare`, `/research`, `/for-teachers`, `/changelog`) | Live |
| 12 pillar blogs + Quick answer CI | Live |
| 6 TikTok companion blogs with transcripts | Live |
| SSR + geo-sync CI guards | Live |
| Social in `Organization.sameAs` | Live |

**Companion blogs:** see [TIKTOK_BLOG_COMPANION.md](./TIKTOK_BLOG_COMPANION.md)

---

**Start here:** [30_MINUTE_LAUNCH.md](./30_MINUTE_LAUNCH.md) (timed 30-min sprint)

## Your manual checklist

| Task | Doc | Status |
|------|-----|--------|
| Google Search Console + sitemap | [SEO_AUTHORITY_PLAYBOOK.md](./SEO_AUTHORITY_PLAYBOOK.md) | You confirmed done |
| Bing Webmaster + sitemap | [BING_WEBMASTER.md](./BING_WEBMASTER.md) | ? |
| `BING_SITE_VERIFICATION` on Vercel | [BING_WEBMASTER.md](./BING_WEBMASTER.md) | ? |
| IG/TikTok bios + link-in-bio | [SOCIAL_BIOS.md](./SOCIAL_BIOS.md) | ? |
| 10 external listicle backlinks | [OUTREACH_TRACKER.md](./OUTREACH_TRACKER.md) · [DIRECTORY_SUBMISSIONS.md](./DIRECTORY_SUBMISSIONS.md) | 0/10 |
| Monthly Perplexity tests (17 queries) | [ai-visibility-checklist.md](./generated/ai-visibility-checklist.md) | ? |
| Wikidata label polish (`MarkScheme`) | [WIKIDATA_ENTITY.md](./WIKIDATA_ENTITY.md) | Optional |

---

## Commands after changes

```bash
pnpm seo:generate-llms && pnpm seo:geo-sync-check
INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow
BASE_URL=https://markscheme.app node scripts/seo-ssr-check.mjs
pnpm seo:ai-visibility   # refresh monthly worksheet
```

---

## What moves citations next

1. **Backlinks** — school resource pages mentioning MarkScheme by name
2. **Branded search** — TikTok/IG bios pointing to `/mark`
3. **Bing/Copilot** — Webmaster Tools + IndexNow
4. **Time + consistency** — monthly Perplexity checks; refresh pillar posts each exam series

Code cannot substitute for (1) and (2). The repo is ready; distribution is the bottleneck.
