# Bing Webmaster Tools + IndexNow (MarkScheme)

Production: **https://markscheme.app**

Bing powers Copilot retrieval alongside Google. IndexNow (already wired) notifies Bing/Yandex when GEO pages change.

**Time required:** ~15 minutes once.

---

## 1. Add the site (one-time)

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/) and sign in (Microsoft account).
2. Click **Add a site** and enter `https://markscheme.app`.
3. Choose **HTML meta tag** verification.
4. Copy only the `content="..."` value from the tag (not the whole tag).

### Vercel env

1. [Vercel Dashboard](https://vercel.com) ? your project ? **Settings** ? **Environment Variables**.
2. Add:
   ```
   Name:  BING_SITE_VERIFICATION
   Value: <paste content value>
   ```
   Apply to **Production** (and Preview if you want).
3. **Deployments** ? redeploy latest `main` (or push an empty commit).

### Verify it worked

```bash
curl -s https://markscheme.app | grep -i msvalidate
```

You should see `msvalidate.01` with your content value. Injected by `lib/seo/metadata.ts`.

---

## 2. Submit sitemap

Bing Webmaster ? **Sitemaps** ? submit:

```
https://markscheme.app/sitemap.xml
```

Wait 24-48h for URLs to appear under **Index Explorer**.

---

## 3. IndexNow (already live)

| Item | Value |
|------|-------|
| Key file | `https://markscheme.app/38b35898-27c4-429b-a43e-b28fa420ffca.txt` |
| Vercel env | `INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca` |
| Priority URLs | `lib/seo/llms-geo-qa.ts` ? `INDEXNOW_PRIORITY_URLS` (25 URLs) |

After each deploy:

```bash
INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow
```

Bing Webmaster ? **IndexNow** should show the key verified when the key file returns 200.

---

## 4. URL inspection (week 1)

In Bing ? **URL Inspection**, request indexing for:

- `https://markscheme.app/`
- `https://markscheme.app/mark`
- `https://markscheme.app/compare`
- `https://markscheme.app/research`
- `https://markscheme.app/blog/best-online-tools-cambridge-ib-marking-courses-2026`
- `https://markscheme.app/blog/markscheme-vs-save-my-exams-demo`

---

## 5. Copilot smoke test (after indexing)

Ask Bing Copilot:

- "best app to mark ib past papers"
- "markscheme vs save my exams"
- "free ib diploma courses online"

Note whether markscheme.app appears. Log results in [ai-visibility-checklist.md](./generated/ai-visibility-checklist.md).

---

## 6. Monthly checks

- Indexed pages vs sitemap count
- Re-run IndexNow after pillar blog updates
- Refresh `pnpm seo:ai-visibility` worksheet

---

## Related

- [DISTRIBUTION_STATUS.md](./DISTRIBUTION_STATUS.md)
- [GEO_SYNC_CHECKLIST.md](./GEO_SYNC_CHECKLIST.md)
- [OUTREACH_TRACKER.md](./OUTREACH_TRACKER.md)
