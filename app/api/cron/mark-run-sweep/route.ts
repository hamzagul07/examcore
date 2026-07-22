import { NextRequest, NextResponse } from 'next/server'
import {
  MARK_RUN_STALE_MINUTES,
  sweepStaleMarkRuns,
} from '@/lib/marking/mark-run-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reclassify marking runs the function never settled as 'abandoned'.
 *
 * When a marking function is killed mid-stream (retry storm, maxDuration) no
 * catch block runs, so the row stays 'running' forever. Those rows ARE the
 * failure signal this sweep converts into a countable one — without it the
 * success-rate view silently ignores the worst failure mode.
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

  const swept = await sweepStaleMarkRuns()
  if (swept > 0) {
    console.warn(`[mark-run-sweep] ${swept} run(s) never settled — marked abandoned`)
  }
  return NextResponse.json({
    ok: true,
    swept,
    stale_after_minutes: MARK_RUN_STALE_MINUTES,
  })
}
