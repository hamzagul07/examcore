import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildCohortGapReport, headlineGap } from '@/lib/teacher/cohort-gaps'
import { NO_STORE, authorizeClassroomRoute, internalError, loadScopedClass } from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET → `{ report: CohortGapReport, headline, students, truncated }` — where
 * the class loses marks, by mark type, over its scoped work (active members,
 * marked since joining, in the class subject). `truncated` is true when the
 * class has more marked work than one report reads; the newest is used.
 * One set's report is `T/assignments/[aid]/gaps`.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, classroom } = auth

  try {
    const scoped = await loadScopedClass(supabase, createServiceClient(), classroom, { withMarking: true })
    const report = buildCohortGapReport(scoped.attempts)
    return NextResponse.json(
      { report, headline: headlineGap(report), students: scoped.studentIds.length, truncated: scoped.truncated },
      { headers: NO_STORE }
    )
  } catch (err) {
    return internalError('gaps', err, 'Could not build the report.')
  }
}
