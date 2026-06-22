import { NextRequest, NextResponse } from 'next/server'
import { sendCommunityDigestBatch } from '@/lib/community/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Weekly trending Exam Room digest — triggered by Vercel Cron. */
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

  const result = await sendCommunityDigestBatch()
  return NextResponse.json({ ok: true, ...result })
}
