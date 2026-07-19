import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklyReportBatch } from '@/lib/reports/weekly-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Weekly premium examiner report — triggered by Vercel Cron. Computes each
 * report always; sends email only when WEEKLY_REPORT_SEND=true (dry-run otherwise). */
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

  const result = await sendWeeklyReportBatch()
  return NextResponse.json({ ok: true, ...result })
}
