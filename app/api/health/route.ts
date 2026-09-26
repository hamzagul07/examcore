import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  allPresent,
  envPresence,
  RECOMMENDED_PRODUCTION_ENV,
  REQUIRED_ENV,
} from '@/lib/env/required'
import { getEnforcementMode } from '@/lib/billing/enforcement-mode'
import { resolveSiteUrl } from '@/lib/site-url'
import { authenticateRouteRequest } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * Secrets that must be set explicitly in production. Presence only — never
 * values. Listed here rather than in lib/env/required because they are not
 * boot requirements: the app runs without them, and the paths that need them
 * fail loudly at first use (see lib/marking/share-token.ts).
 */
const EXPLICIT_SECRET_ENV = [
  'MARK_SHARE_SECRET',
  'UNSUBSCRIBE_SECRET',
  'CRON_SECRET',
  'ADMIN_EMAILS',
] as const

/**
 * `Authorization: Bearer <CRON_SECRET>`, compared in constant time. The same
 * header the cron routes accept, so the uptime monitor that wants the detailed
 * body needs no new credential.
 */
function hasCronBearer(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

async function isPrivilegedCaller(request: NextRequest): Promise<boolean> {
  if (hasCronBearer(request)) return true
  try {
    const { user } = await authenticateRouteRequest(request)
    return isAdminUser(user)
  } catch {
    return false
  }
}

/**
 * Lightweight readiness probe for uptime monitors (Vercel, Better Stack, etc.).
 *
 * Two shapes. Anyone gets `{status, checks, timestamp}` — enough to page on.
 * The detailed body (which env vars are set, the enforcement mode, the site
 * URL, the build SHA) is for the operator: it used to be public, which told
 * anyone whether billing enforcement was off and which optional integrations
 * were missing. (Code review 2026-09-25, §3.) Now it needs the cron bearer or
 * an admin session. Neither shape ever includes a secret's value.
 */
export async function GET(request: NextRequest) {
  const required = envPresence(REQUIRED_ENV)
  const recommended = envPresence(RECOMMENDED_PRODUCTION_ENV)
  const secrets = envPresence(EXPLICIT_SECRET_ENV)

  const checks: Record<string, 'ok' | 'error'> = {
    env_required: allPresent(required) ? 'ok' : 'error',
    supabase: 'error',
  }

  try {
    const admin = createServiceClient()
    const { error } = await admin.from('user_profiles').select('id').limit(1)
    checks.supabase = error ? 'error' : 'ok'
  } catch {
    checks.supabase = 'error'
  }

  const healthy = checks.env_required === 'ok' && checks.supabase === 'ok'
  const status = healthy ? 200 : 503
  const publicBody = {
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }

  if (!(await isPrivilegedCaller(request))) {
    return NextResponse.json(publicBody, { status })
  }

  return NextResponse.json(
    {
      ...publicBody,
      env: {
        required,
        recommended,
        secrets,
      },
      enforcement_mode: getEnforcementMode(),
      site_url: resolveSiteUrl(),
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { status }
  )
}
