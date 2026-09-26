import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { loadAssignmentGaps, reconcileAssignment } from '@/lib/teacher/assignments'
import { NO_STORE, authorizeAssignment, errorResponse, jsonError } from '../../_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; aid: string }> }

/**
 * GET → `{report: CohortGapReport, headline, per_item, students, archived}`
 * over the set's hand-ins (each active student's best attempt per item). An
 * archived class returns an empty report: its marks are kept, its live
 * scripts are not read.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response

  const admin = createServiceClient()
  try {
    await reconcileAssignment(admin, auth.assignment.id)
  } catch (err) {
    console.error('[teacher/assignments] reconcile before gaps failed', {
      assignmentId: auth.assignment.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    const gaps = await loadAssignmentGaps(auth.supabase, admin, auth.assignment.id)
    if (!gaps) return jsonError(404, 'Set not found')
    return NextResponse.json(gaps, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'gaps', 'Could not build the report.')
  }
}
