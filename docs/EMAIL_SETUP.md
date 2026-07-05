# Email setup (MarkScheme)

All app email goes through **Resend**. Auth emails (magic link, confirm signup) can use **Supabase SMTP** with the same Resend API key.

## 1. Resend account

1. Sign up at [resend.com](https://resend.com) (GitHub Student Pack may include credits).
2. **Domains** → add **`markscheme.app`** → add DNS records (SPF, DKIM) at your registrar.
3. Wait until domain status is **Verified**.
4. Create an API key → `RESEND_API_KEY`.

## 2. Vercel environment variables

```env
RESEND_API_KEY=re_...
RESEND_FROM=MarkScheme <hello@markscheme.app>
RESEND_REPLY_TO=hello@markscheme.app
CONTACT_NOTIFY_TO=hello@markscheme.app
```

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Sends all mail |
| `RESEND_FROM` | From address (must use verified `@markscheme.app` domain) |
| `RESEND_REPLY_TO` | Where student replies land (your Google Workspace inbox) |
| `CONTACT_NOTIFY_TO` | Your inbox for admin alerts |

Redeploy after adding.

## 3. What sends automatically

| Event | To student | To you (admin) |
|-------|------------|----------------|
| First sign-in (account created within ~30 min) | — | “Signup started” alert |
| Onboarding completed (first time) | Welcome email | “User ready” alert (subjects, level, goal) |
| Contact form | Auto-reply confirmation | Contact alert (reply-to set to sender) |
| Waitlist signup (`/api/signup`) | — | Waitlist alert |
| Polar credit purchase (sandbox or production) | Receipt | Purchase alert |
| New subscription (checkout completed) | Plan confirmation | Purchase alert |

Marketing blasts are **not** sent automatically. Students opt in under **Account → Preferences** (`email_product_updates`, `email_exam_reminders`). Use `sendProductUpdateEmail()` from code or a future script when you run a campaign.

## 4. Auth emails (magic link, password reset, confirm email)

These are sent by **Supabase Auth**, not the Next.js app.

**Option A — Resend SMTP (recommended)**

Run the setup script (fastest):

```bash
# 1. Create token: https://supabase.com/dashboard/account/tokens
# 2. Add to .env.local:
#    SUPABASE_ACCESS_TOKEN=sbp_...
#    RESEND_API_KEY=re_...   (same as Vercel)
# 3. Run:
node scripts/configure-supabase-smtp.mjs
```

This sets Resend SMTP (`hello@markscheme.app`), sender name **MarkScheme**, and branded templates:

- **Magic link sign-in** → button/link in email
- **Password sign-up confirmation** → 6-digit code (matches `/auth/verify-email`)
- **Password reset** → button/link in email

**Manual (dashboard)**

1. Resend → **SMTP** → copy host, user, password.
2. Supabase → **Authentication** → **SMTP Settings** → enable custom SMTP.
3. Sender: `hello@markscheme.app` (matches transactional mail from the app).
4. Customize templates under **Authentication** → **Email Templates** (optional branding).

**Option B — Supabase default mail**

Works for testing; often lands in spam. Use SMTP for production.

## 5. Polar sandbox mode

Purchase emails fire on **sandbox** checkouts too once `POLAR_WEBHOOK_SECRET` is set and the webhook at `/api/billing/polar-webhook` runs.

## 6. Manual marketing send (developers)

Only users with `email_product_updates = true`:

```ts
import { createServiceClient } from '@/lib/supabase/service'
import { sendProductUpdateEmail } from '@/lib/email/notifications'

const supabase = createServiceClient()
await sendProductUpdateEmail(supabase, userId, {
  subject: 'New subjects on MarkScheme',
  body: 'We added O-Level Computer Science guides…',
})
```

Exam reminders (`email_exam_reminders`) are stored for a future cron; not wired yet.

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| No emails at all | Check `RESEND_API_KEY` on Vercel; domain verified |
| Admin gets mail, users don’t | Check `RESEND_FROM` uses `@markscheme.app` |
| Purchase mail missing | Polar webhook + `POLAR_WEBHOOK_SECRET`; check Vercel logs |
| Welcome never arrives | Welcome sends after **onboarding complete**, not at sign-in; check Resend logs |
| Welcome twice | Should not happen — only first onboarding save triggers welcome |
| Auth mail missing | Configure Supabase SMTP, not only Resend API key |
| Email rate limit exceeded | Supabase default is 30/hr — run `node scripts/configure-supabase-rate-limits.mjs` or raise limits in Auth → Rate Limits |
