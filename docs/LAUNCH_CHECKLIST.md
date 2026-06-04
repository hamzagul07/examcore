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
- [x] Smoke: 55/58 core routes (auth SSR + redirect checks fixed in repo — redeploy to get 58/58)

## You should do next

### Stripe (production billing)

1. Stripe Dashboard → **Webhooks** → endpoint  
   `https://markscheme.app/api/billing/webhook`
2. Copy signing secret → Vercel `STRIPE_WEBHOOK_SECRET` (currently missing in health check)
3. Redeploy

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
