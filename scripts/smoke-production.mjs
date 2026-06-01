#!/usr/bin/env node
/**
 * Production smoke checks — run against local dev or deployed preview/prod.
 *
 *   node scripts/smoke-production.mjs
 *   BASE_URL=https://examcore.ai node scripts/smoke-production.mjs
 *
 * Env keys mirror lib/env/required.ts (keep in sync).
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const RECOMMENDED_ENV = [
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'RESEND_API_KEY',
]

function loadEnvLocal() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function ok(label) {
  console.log(`  ✓ ${label}`)
}

function fail(label, detail = '') {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

async function fetchStatus(url, { expect = [], redirect = 'manual' } = {}) {
  const res = await fetch(url, { redirect })
  const allowed = expect.length === 0 || expect.includes(res.status)
  return { res, allowed, status: res.status }
}

async function main() {
  loadEnvLocal()

  const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  console.log(`\nExamcore production smoke — ${base}\n`)

  let passed = 0
  let failed = 0

  const record = (success, label, detail) => {
    if (success) {
      ok(label)
      passed += 1
    } else {
      fail(label, detail)
      failed += 1
    }
  }

  console.log('Env (local .env.local / process):')
  for (const key of REQUIRED_ENV) {
    record(Boolean(process.env[key]?.trim()), `required ${key}`)
  }
  for (const key of RECOMMENDED_ENV) {
    const present = Boolean(process.env[key]?.trim())
    if (present) ok(`recommended ${key}`)
    else console.log(`  · optional ${key} (not set)`)
  }

  console.log('\nHTTP routes:')

  const isRemote =
    !base.includes('localhost') && !base.includes('127.0.0.1')
  if (isRemote && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    console.log('  ⚠ NEXT_PUBLIC_SITE_URL not set — sitemap/OG may use fallback domain')
  }

  try {
    const health = await fetchStatus(`${base}/api/health`, { expect: [200, 503] })
    let healthOk = health.allowed
    if (health.res.ok) {
      const body = await health.res.json()
      healthOk = body.checks?.supabase === 'ok' && body.checks?.env_required === 'ok'
      if (body.enforcement_mode) {
        console.log(`    enforcement_mode: ${body.enforcement_mode}`)
      }
    }
    record(healthOk, 'GET /api/health', `status ${health.status}`)
  } catch (err) {
    record(false, 'GET /api/health', err instanceof Error ? err.message : String(err))
  }

  const publicRoutes = [
    '/',
    '/pricing',
    '/mark',
    '/join',
    '/how-it-works',
    '/auth/signin',
    '/contact',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
  ]
  for (const path of publicRoutes) {
    try {
      const { allowed, status } = await fetchStatus(`${base}${path}`, { expect: [200] })
      record(allowed, `GET ${path}`, `status ${status}`)
    } catch (err) {
      record(false, `GET ${path}`, err instanceof Error ? err.message : String(err))
    }
  }

  try {
    const res = await fetch(`${base}/api/billing/summary`)
    const data = await res.json()
    record(
      res.ok && data.signedIn === false,
      'GET /api/billing/summary (guest → signedIn false)',
      `status ${res.status}`
    )
  } catch (err) {
    record(false, 'GET /api/billing/summary (guest)', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/classrooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: 'TEST' }),
    })
    record(res.status === 401, 'POST /api/classrooms/join (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/classrooms/join', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: 'student' }),
    })
    record(res.status === 401, 'POST /api/billing/checkout (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/billing/checkout', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/billing/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    record(res.status === 401, 'POST /api/billing/portal (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/billing/portal', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    record(res.status === 401, 'POST /api/onboarding (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/onboarding', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/account/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    })
    record(res.status === 401, 'POST /api/account/delete (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/account/delete', err instanceof Error ? err.message : String(err))
  }

  try {
    const { status } = await fetchStatus(`${base}/api/media/answer-photo`, { expect: [400] })
    record(status === 400, 'GET /api/media/answer-photo (no params → 400)', `status ${status}`)
  } catch (err) {
    record(false, 'GET /api/media/answer-photo', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    record(res.status === 400, 'POST /api/contact (empty → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/contact', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: 'bot-fill' }),
    })
    const data = await res.json().catch(() => ({}))
    record(res.ok && data.ok === true, 'POST /api/contact (honeypot → silent ok)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/contact (honeypot)', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    record(res.status === 400, 'POST /api/signup (empty → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/signup', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/mark/process`, { method: 'POST', body: new FormData() })
    record(res.status === 400, 'POST /api/mark/process (empty → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/mark/process', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/mark/whole-paper/init`, {
      method: 'POST',
      body: new FormData(),
    })
    record(res.status === 400, 'POST /api/mark/whole-paper/init (empty → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/mark/whole-paper/init', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/mark/whole-paper/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    record(res.status === 400, 'POST /api/mark/whole-paper/retry (empty → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/mark/whole-paper/retry', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/celebrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'first_mark' }),
    })
    record(res.status === 401, 'POST /api/celebrations (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/celebrations', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/billing/webhook`, { method: 'POST', body: '' })
    record(res.status === 400, 'POST /api/billing/webhook (no sig → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/billing/webhook', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/billing/sync-customer`, { method: 'POST' })
    record(res.status === 401, 'POST /api/billing/sync-customer (guest → 401)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/billing/sync-customer', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/omni-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '', context: { type: 'landing' } }),
    })
    record(res.status === 400, 'POST /api/omni-ai (empty query → 400)', `status ${res.status}`)
  } catch (err) {
    record(false, 'POST /api/omni-ai', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/auth/check`)
    const data = await res.json()
    record(res.ok && data.user === null, 'GET /api/auth/check (guest → user null)', `status ${res.status}`)
  } catch (err) {
    record(false, 'GET /api/auth/check', err instanceof Error ? err.message : String(err))
  }

  try {
    const res = await fetch(`${base}/api/classrooms/by-code/__smoke_invalid__`)
    const data = await res.json()
    record(res.ok && data.classroom === null, 'GET /api/classrooms/by-code (invalid → null)', `status ${res.status}`)
  } catch (err) {
    record(false, 'GET /api/classrooms/by-code', err instanceof Error ? err.message : String(err))
  }

  const protectedRedirects = ['/dashboard', '/dashboard/progress', '/account/billing', '/teacher', '/admin/ingest']
  for (const path of protectedRedirects) {
    try {
      const { res, status } = await fetchStatus(`${base}${path}`, {
        expect: [307, 308, 302, 303],
      })
      const location = res.headers.get('location') || ''
      const redirectsToAuth =
        status >= 300 &&
        status < 400 &&
        (location.includes('/auth/signin') || location.includes('/dashboard'))
      record(redirectsToAuth, `GET ${path} (auth gate)`, `status ${status}`)
    } catch (err) {
      record(false, `GET ${path} (auth gate)`, err instanceof Error ? err.message : String(err))
    }
  }

  try {
    const res = await fetch(`${base}/auth/signout`, {
      method: 'POST',
      redirect: 'manual',
    })
    const location = res.headers.get('location') || ''
    record(
      (res.status === 302 || res.status === 303) && location.includes('/'),
      'POST /auth/signout (redirects home)',
      `status ${res.status}`
    )
  } catch (err) {
    record(false, 'POST /auth/signout', err instanceof Error ? err.message : String(err))
  }

  console.log(`\n${passed} passed, ${failed} failed`)

  if (process.argv.includes('--preflight') && failed === 0) {
    console.log(`
Launch checklist (passes 15–86 complete):
  ENV
  • NEXT_PUBLIC_SITE_URL=https://examcore.ai
  • ENFORCEMENT_MODE=warn → smoke caps → enforce
  • ADMIN_EMAILS set for /admin access
  • Stripe live keys + webhook pointing at /api/billing/webhook

  SUPABASE (Dashboard)
  • Leaked password protection enabled
  • Custom SMTP for auth emails
  • PITR backups confirmed
  • Migrations applied (contact_messages, answer-photos private, service RLS)

  POST-DEPLOY SMOKE (signed-in, manual)
  • Mark single question + whole paper (guest + signed-in)
  • Omni chat at 80% and at cap (warn then enforce)
  • Join classroom flow (sign up + sign in paths)
  • Teacher review + ink photo refresh
  • Credit chip, billing portal, checkout
  • Mobile: header, FAB, credit dropdown, no horizontal scroll
  • Both themes (Late Night + Zen)

  MONITORING
  • Uptime on GET /api/health
  • Stripe webhook delivery logs
`)
  }

  console.log('')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
