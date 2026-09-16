import { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient } from '@/lib/supabase-server'
import { loadStudyPlan } from '@/lib/plan/study-plan-service'
import { renderPlanIcs } from '@/lib/plan/ics'
import { SITE_URL } from '@/lib/site-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The student's plan as an .ics download — one all-day event per plan day
 * and one for the exam — for the calendar they already check. A download
 * rather than a subscription URL: calendar apps cannot send the session
 * cookie, and a signed public feed would be a second thing to secure.
 */
export async function GET(request: NextRequest) {
  const { user } = await authenticateRouteRequest(request)
  if (!user) return new Response('Not signed in', { status: 401 })

  const saved = await loadStudyPlan(createServiceClient(), user.id)
  if (!saved) return new Response('No plan yet', { status: 404 })

  const ics = renderPlanIcs(saved.plan, {
    siteUrl: SITE_URL,
    planUrl: `${SITE_URL}/dashboard/plan`,
  })
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="markscheme-study-plan.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
