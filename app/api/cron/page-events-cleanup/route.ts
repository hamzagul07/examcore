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

  // visit_sessions is written by the same public beacon and had no retention of
  // its own, so it would have grown without bound — and anyone can mint rows in
  // it by generating session ids. Pruned on the same schedule and window as the
  // events it summarises, so the two never disagree about what history exists.
  const { error: sessionError, count: sessionCount } = await supabase
    .from('visit_sessions')
    .delete({ count: 'exact' })
    .lt('first_seen_at', cutoff)

  if (sessionError) {
    console.error('[page-events-cleanup] visit_sessions delete failed:', sessionError.message)
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    deleted: count ?? 0,
    sessionsDeleted: sessionCount ?? 0,
    cutoff,
  })
}
