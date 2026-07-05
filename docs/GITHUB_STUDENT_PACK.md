# GitHub Student Developer Pack — MarkScheme stack

MarkScheme runs on **Vercel**, **Supabase**, **Polar**, and **Google Gemini**. The [GitHub Student Developer Pack](https://education.github.com/pack) does not cover AI inference, but it can materially reduce hosting, observability, and tooling costs while you grow.

## Claim checklist

1. Verify student status at [GitHub Education](https://education.github.com/).
2. Open the [Student Pack benefits](https://education.github.com/pack/offers) page and claim offers one by one (each partner has its own signup flow).
3. Add secrets to **Vercel** (Production + Preview) and keep `.env.local` in sync with `.env.example`.

## Recommended for MarkScheme

| Benefit | What it helps | Env / setup |
|---------|----------------|-------------|
| **Sentry** | Production errors, performance traces, session replay on errors | `NEXT_PUBLIC_SENTRY_DSN`, optional `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` for source maps |
| **GitHub Pro** | Private repos, more Actions minutes | CI in `.github/workflows/ci.yml` |
| **GitHub Copilot** | Faster iteration (not runtime) | Editor extension |
| **Domain registrars** (Namecheap, Name.com, etc.) | `markscheme.app` or similar | DNS → Vercel; set `NEXT_PUBLIC_SITE_URL` |
| **Vercel** | Hosting (check current pack tier on the offers page) | Connect repo; env vars |
| **1Password** | Team secrets hygiene | Store API keys outside chat/commits |
| **DigitalOcean** (optional) | Long-running `sync-papers` jobs if you outgrow one-off scripts | Not required for core app |

## Not in the Student Pack (plan separately)

| Service | Role | Notes |
|---------|------|--------|
| **Google Gemini** | Marking, study chat, OCR, segmentation | Primary variable cost per mark and upload |
| **Supabase** | Auth, DB, storage | Free tier → paid; also see [Supabase for Startups](https://supabase.com/docs/guides/platform/startups) |
| **Cambridge / Best Exam Help** | Paper PDFs | Licensing and sync scripts — not a pack item |

## Sentry setup (this repo)

Sentry is **optional**: the app builds and runs without a DSN.

1. Create a **Next.js** project in Sentry.
2. Copy the DSN into Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN` (client)
   - `SENTRY_DSN` (server, same value is fine)
3. Optional: create an auth token with `project:releases` and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` so production stack traces are readable.
4. Tune sampling: `SENTRY_TRACES_SAMPLE_RATE` (default `0.1` in production).

Unhandled server errors are reported via `instrumentation.ts` (`onRequestError`). Client and global React errors go through `instrumentation-client.ts` and `app/global-error.tsx`.

## CI (GitHub Actions)

On every push/PR to `main`, CI runs `pnpm typecheck`, `pnpm lint`, and `pnpm build` with placeholder Supabase/AI keys so the workflow does not need real secrets.

Enable **branch protection** on `main`: require the **CI** check to pass before merge.

## Cost mental model

- **Fixed-ish:** Vercel, Supabase base, domain, Sentry (within free/pack limits).
- **Variable:** Gemini tokens per mark, chat message, and OCR page; Polar's merchant-of-record fee per successful charge.
- **Best lever early:** Sentry pack + strict guest/account quotas (already in app) + monitor Sentry for OCR/mark API failures.

## Related docs

- `.env.example` — full variable list
- `README.md` — local setup and deploy
- `docs/SEO-KEYWORDS.md` — marketing (no pack tie-in)
