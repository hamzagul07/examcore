#!/usr/bin/env node
/**
 * Raise Supabase Auth email/OTP rate limits (default 30 emails/hr is too low for testing).
 *
 * Usage: node scripts/configure-supabase-rate-limits.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || 'mcnqxokprggjadtlloyr'

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local')
  process.exit(1)
}

/** Production-friendly limits — well above Supabase default of 30 emails/hour. */
const rateLimitPatch = {
  rate_limit_email_sent: 200,
  rate_limit_otp: 500,
  rate_limit_verify: 360,
  rate_limit_token_refresh: 1800,
}

async function main() {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

  const getRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (getRes.ok) {
    const current = await getRes.json()
    console.log('Current limits:', {
      rate_limit_email_sent: current.rate_limit_email_sent,
      rate_limit_otp: current.rate_limit_otp,
      smtp_max_frequency: current.smtp_max_frequency,
    })
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rateLimitPatch),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`Failed (${res.status}):`, text)
    process.exit(1)
  }

  const updated = JSON.parse(text)
  console.log('\nUpdated limits:', {
    rate_limit_email_sent: updated.rate_limit_email_sent,
    rate_limit_otp: updated.rate_limit_otp,
    rate_limit_verify: updated.rate_limit_verify,
  })
  console.log(
    `\nDashboard: https://supabase.com/dashboard/project/${projectRef}/auth/rate-limits`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
