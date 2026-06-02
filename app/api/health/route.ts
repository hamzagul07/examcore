import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  allPresent,
  envPresence,
  RECOMMENDED_PRODUCTION_ENV,
  REQUIRED_ENV,
} from '@/lib/env/required'
import { getEnforcementMode } from '@/lib/billing/enforcement-mode'
import { resolveSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

/**
 * Lightweight readiness probe for uptime monitors (Vercel, Better Stack, etc.).
 * Does not expose secrets — only checks that core deps respond.
 */
export async function GET() {
  const required = envPresence(REQUIRED_ENV)
  const recommended = envPresence(RECOMMENDED_PRODUCTION_ENV)

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

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      env: {
        required,
        recommended,
      },
      enforcement_mode: getEnforcementMode(),
      site_url: resolveSiteUrl(),
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
