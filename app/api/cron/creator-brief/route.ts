import { NextRequest, NextResponse } from 'next/server'
import { sendCreatorBriefBatch } from '@/lib/creators/brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Weekly creator brief — Vercel Cron, Monday morning. Computes every brief;
 * sends only when CREATOR_BRIEF_SEND=true (dry-run otherwise, so the numbers
 * can be read in the logs before the first real send).
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

  const result = await sendCreatorBriefBatch()
  return NextResponse.json({ ok: true, ...result })
}
