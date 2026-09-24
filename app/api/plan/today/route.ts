import { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { loadRoadmapLight, loadRoadmapRolled, markCheckinOpened, summaryFor } from '@/lib/plan/study-plan-service'
import { remainingMinutesAt, storedSummaryServes } from '@/lib/plan/task-actions'
import { minuteOfDayInZone } from '@/lib/plan/availability'
import { todayInZone } from '@/lib/plan/plan-view'
import { recordRoadmapEvent } from '@/lib/plan/events'
import type { RoadmapTodaySummary } from '@/lib/plan/roadmap-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/plan/today — what the lesson page's chip, /mark's post-result
 * card and the notifications need: the next task and the minutes left,
 * nothing more (RoadmapTodaySummary).
 *
 * Two paths. The fast one reads only the row's small columns and answers
 * from the stored today_summary when it is today's, carries its clock
 * inputs and no rollover is pending: every write already materialises the
 * summary, so between writes only `remainingMinutes` moves, and that is
 * one subtraction (remainingMinutesAt). No plan load, no evidence query —
 * the whole 140 KB row plus the attempts scan was 1.2 s warm on production
 * for a chip that shows one line. The full path (first read of a day, a
 * summary written before it carried openMinutes, ?fresh=1) runs the lazy
 * rollover, recomputes from the plan and marked work, and rewrites the
 * stored summary so the next read is fast again.
 *
 * Never cached: it is per student and changes with every task.
 * ?src=checkin (or a read soon after a check-in went out) resets the
 * reminder backoff on either path.
 */

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401, headers: NO_STORE })

  const admin = createServiceClient()
  try {
    const light = await loadRoadmapLight(admin, user.id)
    if (!light) return jsonWithAuthCookies({ hasPlan: false } satisfies RoadmapTodaySummary, pendingCookies, { headers: NO_STORE })

    const now = new Date()
    const explicit = request.nextUrl.searchParams.get('src') === 'checkin'
    if (await markCheckinOpened(admin, user.id, light, { explicit, now })) {
      await recordRoadmapEvent(admin, user.id, { eventType: 'reminder_clicked', planGeneratedAt: light.generatedAt, revision: light.revision })
    }

    const todayIso = todayInZone(light.timeZone, now)
    const wantsFresh = request.nextUrl.searchParams.get('fresh') === '1'
    if (!wantsFresh && storedSummaryServes(light.todaySummary, todayIso, light.lastRolledDate, light.revision)) {
      return jsonWithAuthCookies(remainingMinutesAt(light.todaySummary, minuteOfDayInZone(light.timeZone, now)), pendingCookies, { headers: NO_STORE })
    }

    const rolled = await loadRoadmapRolled(admin, user.id, now)
    if (!rolled) return jsonWithAuthCookies({ hasPlan: false } satisfies RoadmapTodaySummary, pendingCookies, { headers: NO_STORE })
    const { loaded, ctx } = rolled
    const summary = summaryFor(loaded, ctx)
    const stored = loaded.todaySummary
    const fresh = Boolean(stored && stored.hasPlan && stored.date === ctx.todayIso && stored.revision === loaded.revision && typeof stored.openMinutes === 'number')
    // A stale summary is refreshed in place; no lock needed, the plan itself is untouched.
    if (!fresh) await admin.from('study_plans').update({ today_summary: summary }).eq('user_id', user.id)
    return jsonWithAuthCookies(summary, pendingCookies, { headers: NO_STORE })
  } catch (err) {
    console.error('[plan] today failed', err)
    return jsonWithAuthCookies({ hasPlan: false } satisfies RoadmapTodaySummary, pendingCookies, { status: 500, headers: NO_STORE })
  }
}
