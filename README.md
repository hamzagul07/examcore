# MarkScheme

AI marking for Cambridge International A-Level and O-Level past papers. Students upload handwritten answers and get mark-by-mark feedback tied to real mark schemes.

## Stack

- **Next.js** (App Router) + TypeScript
- **Supabase** — auth, Postgres, storage (`paper-pdfs`, `answer-photos`)
- **Anthropic + Gemini** — OCR and marking pipelines
- **Stripe** — subscriptions and credits

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
| `ANTHROPIC_API_KEY` | Marking + segmentation |
| `GEMINI_API_KEY` | OCR |
| `STRIPE_SECRET_KEY` | Billing (optional locally) |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout |

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

## Key routes

| Path | Description |
|------|-------------|
| `/mark` | Upload and mark answers |
| `/dashboard` | Home + progress |
| `/account/*` | Settings (profile, study setup, billing, privacy) |
| `/pricing` | Plans — founding members get 50% off forever |

## Scripts

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm lint             # ESLint
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
