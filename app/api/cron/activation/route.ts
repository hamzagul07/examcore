import { NextRequest, NextResponse } from 'next/server'
import { sendActivationBatch } from '@/lib/activation/nudge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily activation series — triggered by Vercel Cron.
 *
 * Ships as a dry run: without ACTIVATION_EMAIL_SEND=true it counts candidates
 * and sends nothing, so the segment sizes can be checked against production
 * before a student receives anything.
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

  const result = await sendActivationBatch()
  return NextResponse.json({ ok: true, ...result })
}
