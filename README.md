# MarkScheme

AI marking for Cambridge International A-Level and O-Level past papers. Students upload handwritten answers and get mark-by-mark feedback tied to real mark schemes.

## Stack

- **Next.js** (App Router) + TypeScript
- **Supabase** — auth, Postgres, storage (`paper-pdfs`, `answer-photos`)
- **Google Gemini** — OCR, marking, study chat, and course generation
- **Polar** — subscriptions and credits (merchant of record)
- **Sentry** (optional) — errors and performance in production

## CI

GitHub Actions runs typecheck, lint, and build on pushes and PRs to `main` (see `.github/workflows/ci.yml`). No secrets required for the build step beyond placeholder env vars in the workflow.

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/admin operations |
| `GEMINI_API_KEY` | Marking, OCR, study chat (`gemini-2.5-flash`) |
| `POLAR_ACCESS_TOKEN` | Billing (optional locally) |
| `POLAR_WEBHOOK_SECRET` | Webhook verification |
| `POLAR_SERVER` | `sandbox` (default) or `production` |
| `POLAR_PRODUCT_*` | Product IDs from `scripts/setup-polar-products.mjs` |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring (optional; see [docs/GITHUB_STUDENT_PACK.md](docs/GITHUB_STUDENT_PACK.md)) |

Student Pack benefits (Sentry, domains, etc.) are summarized in [docs/GITHUB_STUDENT_PACK.md](docs/GITHUB_STUDENT_PACK.md).

### 3. Database

Apply migrations in `supabase/migrations/` to your Supabase project (CLI or dashboard SQL editor). Recent additions include contact form storage and email notification prefs (`20260601_contact_notifications.sql`).

### 4. Paper library (optional)

Sync Cambridge past papers from Best Exam Help into Supabase storage:

```bash
pnpm sync-papers:a-level    # Cambridge A-Level, 2020–2025
pnpm sync-papers:o-level    # Cambridge O-Level, 2020–2025
pnpm generate-subject-papers-cache
```

Use `--skip-existing` to resume interrupted syncs.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Marking works for guests (IP rate-limited); signed-in users get per-account quotas.

## Deploy (Vercel)

1. Import the repo on [Vercel](https://vercel.com) and add env vars from `.env.example` (at minimum the three Supabase keys + AI keys).
2. **Before custom domain:** the app uses `https://<your-project>.vercel.app` via `VERCEL_URL` for sitemap/OG when `NEXT_PUBLIC_SITE_URL` is unset.
3. **Supabase → Authentication → URL configuration:** add your Vercel URL(s) to **Redirect URLs**, e.g. `https://your-app.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
4. After **markscheme.app** DNS is live, set `NEXT_PUBLIC_SITE_URL=https://markscheme.app`, redeploy, and update Supabase redirect URLs + the Polar webhook endpoint (`/api/billing/polar-webhook`).
5. **Google sign-in** (optional): enable in Supabase + Google Cloud after the domain is ready — UI is already on `/auth/signin` and `/auth/signup`.

Production checks:

```bash
pnpm build
node scripts/smoke-production.mjs --preflight
# against preview/prod:
BASE_URL=https://your-app.vercel.app node scripts/smoke-production.mjs --preflight
```

Point uptime monitoring at `GET /api/health`.

## Key routes

| Path | Description |
|------|-------------|
| `/mark` | Upload and mark answers |
| `/dashboard` | Home + progress |
| `/account/*` | Settings (profile, study setup, billing, privacy) |
| `/pricing` | Plans — every paid plan starts with a 7-day free trial |

## Scripts

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm typecheck        # TypeScript (omit .next/dev while dev server runs)
pnpm smoke:production # HTTP smoke tests (dev server must be running)
pnpm smoke:preflight  # Smoke + launch checklist
pnpm sync-papers:a-level
pnpm sync-papers:o-level
pnpm generate-subject-papers-cache
pnpm perf:baseline    # Lighthouse baselines (see perf-baseline/)
```

## Performance baselines

```bash
pnpm dev
# separate terminal:
pnpm add -D playwright lighthouse chrome-launcher
npx playwright install chromium
pnpm perf:baseline --base=http://localhost:3000 --tag=before
```

Reports go to `perf-baseline/<tag>/*.json`.

## Notes

- Cambridge International is the only supported board today; others are planned.
- Whole-paper marking on the free tier marks up to **3 questions** per upload (preview); paid plans mark up to 15.
- Guest marks are capped at **10/day per IP**; signed-in users use account quotas instead (avoids shared school Wi‑Fi blocking students).
- Not endorsed by Cambridge Assessment International Education.
