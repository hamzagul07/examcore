import { NextRequest, NextResponse } from 'next/server'
import { sendStreakNudgeBatch } from '@/lib/streaks/nudge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Daily "your streak ends tonight" nudge — triggered by Vercel Cron. In-app
 * notifications always; email only when STREAK_NUDGE_SEND=true (dry-run otherwise). */
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

  const result = await sendStreakNudgeBatch()
  return NextResponse.json({ ok: true, ...result })
}
