import { NextRequest, NextResponse } from 'next/server'
import { sendPlanCheckinBatch } from '@/lib/plan/checkin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Morning study-plan check-in — triggered by Vercel Cron.
 *
 * Ships as a dry run: without PLAN_CHECKIN_SEND=true it counts who would get
 * today's blocks and sends nothing, so the segment can be checked against
 * production before a student receives anything.
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

  const result = await sendPlanCheckinBatch()
  return NextResponse.json({ ok: true, ...result })
}
