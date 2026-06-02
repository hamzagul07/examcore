# Launch checklist (MarkScheme)

Use this after pushing to `main`. Items marked **you** need your GitHub/Vercel/Sentry accounts.

## Done automatically (agent / Supabase)

- [x] Contact migration schema on Supabase (`contact_messages`, email prefs on `user_profiles`)
- [x] Migration recorded as `contact_notifications` in remote history
- [x] GitHub Actions workflow (`.github/workflows/ci.yml`)

## After push — **you**

### GitHub

1. **Install GitHub CLI** (optional): `winget install GitHub.cli`
2. **Branch protection** (Settings → Branches → `main`):
   - Require status check: **quality** (job name in CI workflow)
   - Require PR before merging (recommended)

### Vercel

1. Redeploy **Production** from latest `main`
2. Add env vars (if missing):
   - `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` — after creating Sentry project
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — optional, for source maps
3. Confirm `NEXT_PUBLIC_SUPABASE_*` and AI keys match production Supabase

### Sentry (Student Pack)

1. [education.github.com/pack](https://education.github.com/pack) → claim **Sentry**
2. New project → **Next.js** → copy DSN into Vercel (above)
3. Send a test error: temporarily add `throw new Error('sentry test')` on a page, deploy, revert

### Stripe / domain (Student Pack)

- Stripe fee waiver: pack offers page → connect existing Stripe account
- Domain: point DNS to Vercel when ready; set `NEXT_PUBLIC_SITE_URL`

### Supabase Auth URLs

Add production + preview URLs:

- `https://<project>.vercel.app/auth/callback`
- `https://markscheme.app/auth/callback` (when live)
- `http://localhost:3000/auth/callback`

### Smoke test

```bash
BASE_URL=https://<your-vercel-url> pnpm smoke:preflight
```

### Uptime

Monitor `GET /api/health` on production URL.

## Student Pack reference

See [GITHUB_STUDENT_PACK.md](./GITHUB_STUDENT_PACK.md).
