import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { authenticateRouteRequest } from '@/lib/supabase-server'

/**
 * Record what the student thinks they scored, while the mark is still running.
 *
 * Asked before the result lands, so it is a genuine prediction rather than a
 * reaction to the score — the gap between the two is the only measure of
 * whether a student can read their own answer, which is the thing that actually
 * transfers into the exam hall.
 *
 * Keyed on the run rather than the attempt because the attempt row does not
 * exist yet: it is written when marking finishes. The run is the only handle
 * both sides hold mid-wait.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  let body: { mark_run_id?: unknown; predicted_marks?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const runId = typeof body.mark_run_id === 'string' ? body.mark_run_id : ''
  if (!UUID_RE.test(runId)) {
    return NextResponse.json({ error: 'mark_run_id is required' }, { status: 400 })
  }

  const raw = body.predicted_marks
  const predicted = typeof raw === 'number' ? Math.round(raw) : NaN
  // Upper bound guards the histogram, not the student: nobody predicts 900 on a
  // question, so a value that large is a bug or a probe, not an answer.
  if (!Number.isFinite(predicted) || predicted < 0 || predicted > 200) {
    return NextResponse.json(
      { error: 'predicted_marks must be between 0 and 200' },
      { status: 400 }
    )
  }

  const { user } = await authenticateRouteRequest(request)
  const userId = user?.id ?? null

  const { data: run } = await supabaseAdmin
    .from('mark_runs')
    .select('id, user_id, attempt_id')
    .eq('id', runId)
    .maybeSingle()

  if (!run) {
    return NextResponse.json({ error: 'Unknown mark run' }, { status: 404 })
  }
  // A guest's run has no owner, so possession of the id is the only claim there
  // is. An owned run has to match the caller, or anyone holding a run id could
  // write to another student's record.
  if (run.user_id && run.user_id !== userId) {
    return NextResponse.json({ error: 'Not your mark run' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('mark_runs')
    .update({ predicted_marks: predicted })
    .eq('id', runId)

  if (error) {
    console.warn('[mark/prediction] save failed', error)
    return NextResponse.json({ error: 'Could not save prediction' }, { status: 500 })
  }

  // Losing side of a narrow race: the mark can finish between the student
  // choosing a number and this request landing, and the marking route copies
  // the prediction onto the attempt only once, on its way out. Without this
  // write-through, a prediction made in those last seconds would be stranded on
  // the run — invisible to the attempt page and to the mark-ready email.
  if (run.attempt_id) {
    const { error: copyError } = await supabaseAdmin
      .from('attempts')
      .update({ predicted_marks: predicted })
      .eq('id', run.attempt_id)
    if (copyError) {
      console.warn('[mark/prediction] late copy to attempt failed', copyError)
    }
  }

  return NextResponse.json({ ok: true })
}
