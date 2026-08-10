import { NextRequest, NextResponse } from 'next/server'
import { sendMaxLifecycleBatch } from '@/lib/max/lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily Max lifecycle — vault tour (~24h), day-4 coach, sprint window grants.
 *
 * Tour/day-4 dry-run unless MAX_LIFECYCLE_EMAIL_SEND=true.
 * Sprint gifts always run (same as opening Vault in the 14-day window).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const result = await sendMaxLifecycleBatch()
  return NextResponse.json({ ok: true, ...result })
}
