import { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { loadRoadmapRolled, markCheckinOpened, summaryFor } from '@/lib/plan/study-plan-service'
import { recordRoadmapEvent } from '@/lib/plan/events'
import type { RoadmapTodaySummary } from '@/lib/plan/roadmap-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/plan/today — what the lesson page's chip, /mark's post-result
 * card and the notifications need: the next task and the minutes left,
 * nothing more (RoadmapTodaySummary). The summary is recomputed from the
 * plan on every read — it is pure and cheap, and the minutes left depend on
 * the clock — and written back to today_summary only when the stored one is
 * stale by date or revision. Runs the lazy rollover first. Never cached: it
 * is per student and changes with every task. ?src=checkin (or a read soon
 * after a check-in went out) resets the reminder backoff.
 */

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401, headers: NO_STORE })

  const admin = createServiceClient()
  try {
    const rolled = await loadRoadmapRolled(admin, user.id)
    if (!rolled) return jsonWithAuthCookies({ hasPlan: false } satisfies RoadmapTodaySummary, pendingCookies, { headers: NO_STORE })
    const { loaded, ctx } = rolled

    const explicit = request.nextUrl.searchParams.get('src') === 'checkin'
    if (await markCheckinOpened(admin, user.id, loaded, { explicit, now: ctx.now })) {
      await recordRoadmapEvent(admin, user.id, { eventType: 'reminder_clicked', planGeneratedAt: loaded.generatedAt, revision: loaded.revision })
    }

    const summary = summaryFor(loaded, ctx)
    const stored = loaded.todaySummary
    const fresh = Boolean(stored && stored.hasPlan && stored.date === ctx.todayIso && stored.revision === loaded.revision)
    // A stale summary is refreshed in place; no lock needed, the plan itself is untouched.
    if (!fresh) await admin.from('study_plans').update({ today_summary: summary }).eq('user_id', user.id)
    return jsonWithAuthCookies(summary, pendingCookies, { headers: NO_STORE })
  } catch (err) {
    console.error('[plan] today failed', err)
    return jsonWithAuthCookies({ hasPlan: false } satisfies RoadmapTodaySummary, pendingCookies, { status: 500, headers: NO_STORE })
  }
}
