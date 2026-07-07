# 30-minute distribution sprint

Do these in order. Check boxes as you go. Full context: [DISTRIBUTION_STATUS.md](./DISTRIBUTION_STATUS.md).

---

## Minutes 0-5: Social bios

Open [SOCIAL_BIOS.md](./SOCIAL_BIOS.md).

- [ ] Instagram bio ? link `https://markscheme.app/mark`
- [ ] TikTok bio ? same link (`utm_source=tiktok`)
- [ ] Optional: Linktree with 5 links from the table

---

## Minutes 5-15: Bing Webmaster

Open [BING_WEBMASTER.md](./BING_WEBMASTER.md).

- [ ] Add site at https://www.bing.com/webmasters/
- [ ] Copy `msvalidate.01` content ? Vercel `BING_SITE_VERIFICATION`
- [ ] Redeploy, verify: `curl -s https://markscheme.app | grep msvalidate`
- [ ] Submit sitemap: `https://markscheme.app/sitemap.xml`

---

## Minutes 15-25: Directory submissions

Open [DIRECTORY_SUBMISSIONS.md](./DIRECTORY_SUBMISSIONS.md). Paste fields, submit:

- [ ] Indie Hackers (row 1 in [OUTREACH_TRACKER.md](./OUTREACH_TRACKER.md))
- [ ] BetaList (row 2)
- [ ] AlternativeTo vs Save My Exams (row 3)

---

## Minutes 25-30: Log + smoke test

- [ ] Update dates in OUTREACH_TRACKER
- [ ] Run `BASE_URL=https://markscheme.app pnpm seo:distribution-check`
- [ ] Ask Bing Copilot: *"best app to mark ib past papers"* - note if MarkScheme appears
- [ ] Ask Perplexity: *"markscheme vs save my exams"* - log in [ai-visibility-checklist.md](./generated/ai-visibility-checklist.md)

---

## Week 1 (optional, 30 min/day)

- [ ] Reddit barnacle comments — rows 4-6 in [REDDIT_BARNACLE_COMMENTS.md](./REDDIT_BARNACLE_COMMENTS.md)
- [ ] School / tutor emails — rows 7-8 in [OUTREACH_DM_EMAILS.md](./OUTREACH_DM_EMAILS.md)
- [ ] One influencer DM — row 9
- [ ] One newsletter pitch — row 10

---

## Done for today?

Code and GEO are complete. Next wins: **backlinks** (school emails from [OUTREACH_DM_EMAILS.md](./OUTREACH_DM_EMAILS.md)), **monthly** Perplexity tests, **TikTok** descriptions pointing to companion blogs.

```bash
# After your next on-site content change:
INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow
```
