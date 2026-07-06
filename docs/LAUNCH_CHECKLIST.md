# Launch checklist (MarkScheme)

Production: **https://markscheme.app**

## Done

- [x] Domain `markscheme.app` → Vercel
- [x] `NEXT_PUBLIC_SITE_URL=https://markscheme.app`
- [x] Health: `/api/health` → `status: ok`
- [x] Sitemap / canonical URLs use `markscheme.app`
- [x] GitHub Actions CI (typecheck, lint, build)
- [x] Supabase `contact_notifications` migration
- [x] Sentry DSN in Vercel (optional monitoring)
- [x] Smoke: 63/63 core routes (post-deploy Jul 2026 — calculators, signup redirect SSR, insights)
- [x] GSC indexing batches: `pnpm seo:gsc-urls` (88 URLs, tiers 1–4 + IB + 9706 courses) — [SEO_MEASUREMENT.md](./SEO_MEASUREMENT.md)
- [x] 9706 Accounting: 34/34 premium lessons (full A-Level syllabus)
- [x] UTF-8 cleanup: blog cross-links + all 32 grade-boundary guides (Jul 2026)

## You should do next

### Polar (production billing)

1. Create a **production** Polar org at polar.sh (sandbox values don't carry over) and an Organization Access Token
2. Create production products: `POLAR_SERVER=production POLAR_ACCESS_TOKEN=… node scripts/setup-polar-products.mjs` → copy the 9 `POLAR_PRODUCT_*` IDs
3. Polar → Settings → **Webhooks** → endpoint  
   `https://markscheme.app/api/billing/polar-webhook`  
   Subscribe to: `order.paid`, `order.refunded`, `subscription.created`, `.active`, `.updated`, `.canceled`, `.uncanceled`, `.past_due`, `.revoked`
4. Vercel env: `POLAR_SERVER=production`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, all 9 `POLAR_PRODUCT_*`, `ENFORCEMENT_MODE=enforce`
5. Redeploy, then test with a real card: subscribe (7-day trial on the first Scholar/Max subscription; Pro bills immediately) → check webhook deliveries + `user_subscriptions.tier`; buy a credit pack → balance bumps; refund both from Polar → revoke + clawback

### Supabase + Google sign-in

1. **Authentication → URL configuration**  
   - Site URL: `https://markscheme.app`  
   - Redirect URLs: `https://markscheme.app/auth/callback`, `http://localhost:3000/auth/callback`
2. **Authentication → Providers → Google** — enabled with Client ID + Secret from Google Cloud
3. **Google Cloud Console** → OAuth client → Authorized redirect URI:  
   `https://mcnqxokprggjadtlloyr.supabase.co/auth/v1/callback`  
   (not `markscheme.app` — Google talks to Supabase first)  
   **Consent screen shows `supabase.co`?** → [GOOGLE_OAUTH_BRANDING.md](./GOOGLE_OAUTH_BRANDING.md) (custom domain + Google brand verification)
4. **Auth → Password security** → enable [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

### GitHub

- **Branch protection** on `main`: require CI job **quality**

### Email (Resend)

1. Verify domain **markscheme.app** in Resend → add `RESEND_API_KEY`, `RESEND_FROM`, `CONTACT_NOTIFY_TO` on Vercel  
2. Supabase → **SMTP** with Resend (magic link / confirm emails) — [EMAIL_SETUP.md](./EMAIL_SETUP.md)  
3. Sends: welcome, purchase receipts, admin alerts (contact, signup, billing)

### SEO & authority (after deploy)

1. Google Search Console + Bing Webmaster — submit `https://markscheme.app/sitemap.xml`
2. Vercel env: `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` (optional `NEXT_PUBLIC_TWITTER_HANDLE`, social `sameAs` URLs)
3. Follow [SEO_TWELVE_PILLARS.md](./SEO_TWELVE_PILLARS.md) (in-site implementation) and [SEO_AUTHORITY_PLAYBOOK.md](./SEO_AUTHORITY_PLAYBOOK.md) (backlinks)
4. Run `pnpm seo:audit` after content changes; track queries in [SEO_MEASUREMENT.md](./SEO_MEASUREMENT.md)
5. Advanced stack: [SEO_ADVANCED_THIRTEEN.md](./SEO_ADVANCED_THIRTEEN.md) — entity env vars, `pnpm seo:ssr-check` on prod
6. Information gain / AI retrieval: [SEO_INFORMATION_GAIN_TWELVE.md](./SEO_INFORMATION_GAIN_TWELVE.md) — `/insights`, `pnpm seo:fan-out-lint`, `pnpm seo:ai-visibility`
7. Results season distribution: [BARNACLE_SEO_PLAYBOOK.md](./BARNACLE_SEO_PLAYBOOK.md) — Reddit templates, UTM links, Jul/Aug calendar

### Optional
- Uptime monitor on `GET https://markscheme.app/api/health`

### Enforcement

Production uses `ENFORCEMENT_MODE=enforce` (paid limits active). For a softer launch use `warn` in Vercel, then flip to `enforce` after monitoring.

## Verify after each deploy

```bash
BASE_URL=https://markscheme.app pnpm smoke:preflight
```

## Student Pack

See [GITHUB_STUDENT_PACK.md](./GITHUB_STUDENT_PACK.md).
