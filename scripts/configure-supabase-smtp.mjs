#!/usr/bin/env node
/**
 * Configure Supabase Auth custom SMTP (Resend) + branded email templates.
 *
 * Prerequisites:
 *   1. Resend domain markscheme.app verified
 *   2. RESEND_API_KEY in .env.local (same key as Vercel)
 *   3. SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *      (scope: auth_config write / project auth)
 *
 * Usage:
 *   node scripts/configure-supabase-smtp.mjs
 *   node scripts/configure-supabase-smtp.mjs --dry-run
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')

const SITE_NAME = 'MarkScheme'
const CONTACT_EMAIL = 'hello@markscheme.app'
const SITE_URL = 'https://markscheme.app'

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env.local')

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const resendKey = process.env.RESEND_API_KEY?.trim()
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') ||
  'mcnqxokprggjadtlloyr'

if (!accessToken) {
  console.error(`
Missing SUPABASE_ACCESS_TOKEN.

1. Open https://supabase.com/dashboard/account/tokens
2. Generate token (name: markscheme-smtp) with auth config access
3. Add to .env.local:
   SUPABASE_ACCESS_TOKEN=sbp_...
4. Re-run: node scripts/configure-supabase-smtp.mjs
`)
  process.exit(1)
}

if (!resendKey) {
  console.error(`
Missing RESEND_API_KEY in .env.local (use the same key as on Vercel).
`)
  process.exit(1)
}

function authEmailLinkShell(bodyHtml, ctaLabel = 'Continue') {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f4f0;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e8e4dc;border-radius:16px">
<tr><td style="padding:24px 28px 8px;font-family:Georgia,serif;font-size:22px;font-weight:600">
${SITE_NAME}<span style="color:#9f1239">.</span>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#333">
${bodyHtml}
<p style="margin:28px 0 0"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#9f1239;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${ctaLabel}</a></p>
<p style="margin:20px 0 0;font-size:13px;color:#666">If the button does not work, copy this link:<br><a href="{{ .ConfirmationURL }}" style="color:#9f1239;word-break:break-all">{{ .ConfirmationURL }}</a></p>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#666">
Questions? Reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#9f1239">${CONTACT_EMAIL}</a>.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

/** Password sign-up verification — app uses /auth/verify-email with 6-digit OTP. */
function authEmailOtpShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f4f0;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e8e4dc;border-radius:16px">
<tr><td style="padding:24px 28px 8px;font-family:Georgia,serif;font-size:22px;font-weight:600">
${SITE_NAME}<span style="color:#9f1239">.</span>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#333">
${bodyHtml}
<p style="margin:24px 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#666">Your verification code</p>
<p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#1a1a1a">{{ .Token }}</p>
<p style="margin:20px 0 0;font-size:13px;color:#666">Enter this code on the verification page. It expires soon.</p>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#666">
Questions? Reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#9f1239">${CONTACT_EMAIL}</a>.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

const authPatch = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: CONTACT_EMAIL,
  smtp_sender_name: SITE_NAME,
  smtp_host: 'smtp.resend.com',
  smtp_port: '587',
  smtp_user: 'resend',
  smtp_pass: resendKey,
  smtp_max_frequency: 60,
  mailer_otp_length: 6,
  mailer_subjects_magic_link: `Sign in to ${SITE_NAME}`,
  mailer_subjects_confirmation: `Your ${SITE_NAME} verification code`,
  mailer_subjects_recovery: `Reset your ${SITE_NAME} password`,
  mailer_subjects_email_change: `Confirm your new email — ${SITE_NAME}`,
  mailer_templates_magic_link_content: authEmailLinkShell(
    '<p>Use the button below to sign in to your account. This link expires soon.</p>',
    'Sign in to MarkScheme'
  ),
  mailer_templates_confirmation_content: authEmailOtpShell(
    '<p>Thanks for signing up. Use the code below to verify your email and finish creating your account.</p>'
  ),
  mailer_templates_recovery_content: authEmailLinkShell(
    '<p>We received a request to reset your password. If you did not ask for this, you can ignore this email.</p>',
    'Reset password'
  ),
  mailer_templates_email_change_content: authEmailLinkShell(
    '<p>Confirm your new email address for your MarkScheme account.</p>',
    'Confirm new email'
  ),
}

async function main() {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

  console.log(`Project ref: ${projectRef}`)
  console.log(`SMTP sender: ${SITE_NAME} <${CONTACT_EMAIL}>`)
  console.log(`Resend host: smtp.resend.com:587`)

  if (DRY_RUN) {
    console.log('\n[dry-run] Would PATCH auth config (smtp_pass redacted):')
    console.log(
      JSON.stringify({ ...authPatch, smtp_pass: '[REDACTED]' }, null, 2)
    )
    return
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authPatch),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`\nFailed (${res.status}):`, text)
    if (res.status === 401) {
      console.error('\nToken invalid or expired — create a new one at:')
      console.error('https://supabase.com/dashboard/account/tokens')
    }
    process.exit(1)
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }

  console.log('\nSupabase Auth SMTP configured successfully.')
  if (parsed?.smtp_host) {
    console.log(`  smtp_host: ${parsed.smtp_host}`)
    console.log(`  smtp_admin_email: ${parsed.smtp_admin_email}`)
    console.log(`  smtp_sender_name: ${parsed.smtp_sender_name}`)
  }
  console.log('\nNext: sign out and request a magic link to test auth email.')
  console.log(`Dashboard: https://supabase.com/dashboard/project/${projectRef}/auth/smtp`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
