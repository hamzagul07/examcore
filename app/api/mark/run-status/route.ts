import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { authenticateRouteRequest } from '@/lib/supabase-server'

/**
 * Has this mark finished?
 *
 * The in-app half of leaving a mark running. Email covers the student who
 * closed the browser; this covers the one who stayed in the app and went to do
 * something else, who should not have to check their inbox to find out that a
 * mark completed two tabs ago.
 *
 * Reads the run rather than the attempt because the run id is the only handle
 * the client holds from the moment marking starts — the attempt does not exist
 * until it finishes.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const runId = new URL(request.url).searchParams.get('mark_run_id') ?? ''
  if (!UUID_RE.test(runId)) {
    return NextResponse.json({ error: 'mark_run_id is required' }, { status: 400 })
  }

  const { user } = await authenticateRouteRequest(request)
  const userId = user?.id ?? null

  const { data: run } = await supabaseAdmin
    .from('mark_runs')
    .select('id, user_id, status, attempt_id, subject_code')
    .eq('id', runId)
    .maybeSingle()

  if (!run) {
    return NextResponse.json({ error: 'Unknown mark run' }, { status: 404 })
  }
  // Same rule as the prediction endpoint: an owned run must match the caller,
  // a guest run is gated only by the unguessable id.
  if (run.user_id && run.user_id !== userId) {
    return NextResponse.json({ error: 'Not your mark run' }, { status: 403 })
  }

  // The score comes from the attempt, not the run — the run records that
  // marking happened, the attempt records what it decided.
  let marksEarned: number | null = null
  let totalMarks: number | null = null
  if (run.attempt_id) {
    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .select('marks_earned, total_marks')
      .eq('id', run.attempt_id)
      .maybeSingle()
    marksEarned = (attempt?.marks_earned as number | null) ?? null
    totalMarks = (attempt?.total_marks as number | null) ?? null
  }

  return NextResponse.json({
    status: run.status,
    // 'running' is the only non-terminal state; everything else means stop polling.
    settled: run.status !== 'running',
    attempt_id: run.attempt_id ?? null,
    subject_code: run.subject_code ?? null,
    marks_earned: marksEarned,
    total_marks: totalMarks,
  })
}
