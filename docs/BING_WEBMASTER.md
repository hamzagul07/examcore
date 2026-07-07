# Bing Webmaster Tools + IndexNow (MarkScheme)

Production: **https://markscheme.app**

Bing powers Copilot retrieval alongside Google. IndexNow (already wired) notifies Bing/Yandex when GEO pages change.

---

## 1. Add the site (one-time)

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. **Add a site** ? `https://markscheme.app`
3. Verify ownership — pick one:
   - **HTML meta tag** (recommended): copy the `content` value for `msvalidate.01`
   - **DNS CNAME** if you prefer DNS
4. On Vercel ? Project ? Settings ? Environment Variables:
   ```
   BING_SITE_VERIFICATION=<msvalidate.01 content value>
   ```
5. Redeploy. Confirm the tag appears in page source (`lib/seo/metadata.ts` injects it).

---

## 2. Submit sitemap

In Bing Webmaster ? **Sitemaps** ? submit:

```
https://markscheme.app/sitemap.xml
```

Also submit in **Google Search Console** if not done: same URL.

---

## 3. IndexNow (already live)

| Item | Value |
|------|-------|
| Key file | `public/38b35898-27c4-429b-a43e-b28fa420ffca.txt` |
| Vercel env | `INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca` |
| Priority URLs | `lib/seo/llms-geo-qa.ts` ? `INDEXNOW_PRIORITY_URLS` |

After each GEO deploy:

```bash
INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow
```

Bing Webmaster ? **IndexNow** should show the key as verified once the key file returns 200.

---

## 4. URL inspection (week 1)

Request indexing for money pages:

- `/`
- `/mark`
- `/compare`
- `/research`
- `/for-teachers`
- `/blog/best-online-tools-cambridge-ib-marking-courses-2026`

---

## 5. Monthly checks

- **Pages indexed** vs submitted in sitemap
- **Copilot / Bing Chat** test queries from `docs/generated/ai-visibility-checklist.md`
- Re-run IndexNow after pillar blog or `/research` updates

---

## Related

- [GEO_SYNC_CHECKLIST.md](./GEO_SYNC_CHECKLIST.md)
- [SEO_AUTHORITY_PLAYBOOK.md](./SEO_AUTHORITY_PLAYBOOK.md)
- [OUTREACH_LISTICLE.md](./OUTREACH_LISTICLE.md)
