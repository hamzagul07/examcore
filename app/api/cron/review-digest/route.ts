import { NextRequest, NextResponse } from 'next/server'
import { sendReviewDigestBatch } from '@/lib/review/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Weekly "topics due for review" re-engagement — triggered by Vercel Cron.
 * In-app notifications always; email only when REVIEW_DIGEST_SEND=true. */
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

  const result = await sendReviewDigestBatch()
  return NextResponse.json({ ok: true, ...result })
}
