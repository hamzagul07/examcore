import { NextRequest, NextResponse } from 'next/server'
import { sendTrialEndBatch } from '@/lib/reports/trial-end-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Reverse-trial emails — triggered by Vercel Cron. Selects and computes
 * always; sends email only when TRIAL_EMAIL_SEND=true (dry-run otherwise).
 * Mirrors the weekly-report cron's auth exactly. */
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

  const result = await sendTrialEndBatch()
  return NextResponse.json({ ok: true, ...result })
}
