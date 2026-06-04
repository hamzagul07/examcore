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
RESEND_FROM=MarkScheme <notifications@markscheme.app>
CONTACT_NOTIFY_TO=hello@markscheme.app
```

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Sends all mail |
| `RESEND_FROM` | From address (must use verified domain) |
| `CONTACT_NOTIFY_TO` | Your inbox for admin alerts |

Redeploy after adding.

## 3. What sends automatically

| Event | To student | To you (admin) |
|-------|------------|----------------|
| New account (first sign-in within ~10 min) | Welcome email | New account alert |
| Contact form | — | Contact alert |
| Waitlist signup (`/api/signup`) | — | Waitlist alert |
| Stripe credit purchase (test or live) | Receipt | Purchase alert |
| New subscription (checkout completed) | Plan confirmation | Purchase alert |

Marketing blasts are **not** sent automatically. Students opt in under **Account → Preferences** (`email_product_updates`, `email_exam_reminders`). Use `sendProductUpdateEmail()` from code or a future script when you run a campaign.

## 4. Auth emails (magic link, password reset, confirm email)

These are sent by **Supabase Auth**, not the Next.js app.

**Option A — Resend SMTP (recommended)**

1. Resend → **SMTP** → copy host, user, password.
2. Supabase → **Authentication** → **SMTP Settings** → enable custom SMTP.
3. Sender: `notifications@markscheme.app` (or `hello@markscheme.app`).
4. Customize templates under **Authentication** → **Email Templates** (optional branding).

**Option B — Supabase default mail**

Works for testing; often lands in spam. Use SMTP for production.

## 5. Stripe test mode

Purchase emails fire on **test** checkouts too once `STRIPE_WEBHOOK_SECRET` (test `whsec_…`) is set and the webhook runs.

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
| Purchase mail missing | Stripe webhook + `STRIPE_WEBHOOK_SECRET`; check Vercel logs |
| Welcome twice | Rare; only sends if account created &lt; 10 minutes ago |
| Auth mail missing | Configure Supabase SMTP, not only Resend API key |
