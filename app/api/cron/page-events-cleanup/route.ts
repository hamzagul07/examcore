import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 90

/** Prune page_events older than the retention window — triggered by Vercel Cron. */
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

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createServiceClient()
  const { error, count } = await supabase
    .from('page_events')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    console.error('[page-events-cleanup] delete failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0, cutoff })
}
