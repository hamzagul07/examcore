import { NextRequest, NextResponse } from 'next/server'
import {
  MARK_RUN_STALE_MINUTES,
  listUnreleasedAbandonedRuns,
  markMarkRunReservationReleased,
  sweepStaleMarkRuns,
  type AbandonedMarkRun,
} from '@/lib/marking/mark-run-log'
import { releaseMarkReservationById } from '@/lib/billing/enforcement'
import { notifyMarkFailed } from '@/lib/marking/notify-mark-ready'
import { namedSubjectOrNull } from '@/lib/marking/subject-name'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reclassify marking runs the function never settled as 'abandoned', and give
 * back what they were holding.
 *
 * When a marking function is killed mid-stream (retry storm, maxDuration) no
 * catch block runs, so the row stays 'running' forever. Those rows ARE the
 * failure signal this sweep converts into a countable one — without it the
 * success-rate view silently ignores the worst failure mode.
 *
 * The same killed function also reaches neither finalize nor release for its
 * quota reservation, so the student lost a mark — or a credit — this period
 * for a mark they never received. The route records the reservation on the
 * run; this is the only place left that can release it.
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

  // Reservations to give back: the runs just abandoned, plus any an earlier
  // sweep abandoned and then died before releasing. Each run is released once
  // — the abandon update returns a run only to the sweep that flipped it, and
  // the stamp keeps the retry list from re-listing it — and the release RPC is
  // itself idempotent, so a duplicate could refund nothing anyway.
  const owedRelease = new Map<string, AbandonedMarkRun>()
  for (const run of swept) {
    if (run.reservation_event_id && run.user_id) owedRelease.set(run.id, run)
  }
  for (const run of await listUnreleasedAbandonedRuns()) {
    if (run.reservation_event_id && run.user_id && !owedRelease.has(run.id)) {
      owedRelease.set(run.id, run)
    }
  }
  let released = 0
  let creditsRefunded = 0
  for (const run of owedRelease.values()) {
    try {
      const result = await releaseMarkReservationById(
        run.user_id!,
        run.reservation_event_id!
      )
      released += result.released
      creditsRefunded += result.credits_refunded
      await markMarkRunReservationReleased(run.id)
    } catch (err) {
      // Left unstamped: the next sweep picks it up from the retry list.
      console.warn(`[mark-run-sweep] release failed for run ${run.id}`, err)
    }
  }
  if (owedRelease.size > 0) {
    console.warn(
      `[mark-run-sweep] released ${released} reserved mark(s) (${creditsRefunded} credit(s) refunded) across ${owedRelease.size} abandoned run(s)`
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
    reservations_owed: owedRelease.size,
    reservations_released: released,
    credits_refunded: creditsRefunded,
    owed_notification: owed.length,
    notified,
    stale_after_minutes: MARK_RUN_STALE_MINUTES,
  })
}
