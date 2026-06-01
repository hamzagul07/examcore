import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Lightweight readiness probe for uptime monitors (Vercel, Better Stack, etc.).
 * Does not expose secrets — only checks that core deps respond.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {
    supabase: 'error',
  }

  try {
    const admin = createServiceClient()
    const { error } = await admin.from('user_profiles').select('id').limit(1)
    checks.supabase = error ? 'error' : 'ok'
  } catch {
    checks.supabase = 'error'
  }

  const healthy = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
