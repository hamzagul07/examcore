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

### Supabase

1. **Authentication → URL configuration**  
   - `https://markscheme.app/auth/callback`  
   - `http://localhost:3000/auth/callback`
2. **Auth → Password security** → enable [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

### GitHub

- **Branch protection** on `main`: require CI job **quality**

### Optional

- `RESEND_API_KEY` — email alerts when someone uses `/contact`
- Uptime monitor on `GET https://markscheme.app/api/health`
- Google Search Console → submit `https://markscheme.app/sitemap.xml`

### Enforcement

Production uses `ENFORCEMENT_MODE=enforce` (paid limits active). For a softer launch use `warn` in Vercel, then flip to `enforce` after monitoring.

## Verify after each deploy

```bash
BASE_URL=https://markscheme.app pnpm smoke:preflight
```

## Student Pack

See [GITHUB_STUDENT_PACK.md](./GITHUB_STUDENT_PACK.md).
