import { NextRequest, NextResponse } from 'next/server'
import {
  MARK_RUN_STALE_MINUTES,
  sweepStaleMarkRuns,
} from '@/lib/marking/mark-run-log'
import { notifyMarkFailed } from '@/lib/marking/notify-mark-ready'
import { namedSubjectOrNull } from '@/lib/marking/subject-name'

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
  if (swept.length > 0) {
    console.warn(
      `[mark-run-sweep] ${swept.length} run(s) never settled — marked abandoned`
    )
  }

  // The students in this set were told they could close the tab, and then the
  // function died before anything could tell them otherwise. This sweep is the
  // only place left that knows. Guests are skipped — there is no address.
  const owed = swept.filter((run) => run.client_disconnected && run.user_id)
  let notified = 0
  for (const run of owed) {
    const sent = await notifyMarkFailed({
      userId: run.user_id,
      subjectLabel: namedSubjectOrNull(run.subject_code),
    })
    if (sent) notified += 1
  }
  if (owed.length > 0) {
    console.warn(
      `[mark-run-sweep] ${notified}/${owed.length} abandoned run(s) notified`
    )
  }

  return NextResponse.json({
    ok: true,
    swept: swept.length,
    owed_notification: owed.length,
    notified,
    stale_after_minutes: MARK_RUN_STALE_MINUTES,
  })
}
