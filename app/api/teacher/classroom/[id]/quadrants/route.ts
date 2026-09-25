import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { computeStudentQuadrants } from '@/lib/teacher-analytics'
import { getStudentProfiles } from '@/lib/teacher-classroom-data'
import { NO_STORE, authorizeClassroomRoute, internalError, loadScopedClass } from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET → `{ students: StudentQuadrantMetric[], truncated }` — one point per
 * active student with marked work in the class subject since joining
 * (accuracy, minutes per mark or null when untimed, coverage, predicted
 * grade, biggest deficit, quadrant). Full names are for the teacher's own
 * screen; names only ever reach a prompt through displayName.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, classroom } = auth

  try {
    const scoped = await loadScopedClass(supabase, createServiceClient(), classroom, { withMarking: false })
    const profiles = scoped.studentIds.length > 0 ? await getStudentProfiles(supabase, scoped.studentIds) : new Map()
    return NextResponse.json(
      {
        students: computeStudentQuadrants(
          scoped.attempts,
          scoped.studentIds,
          classroom.subject_code,
          classroom.board ?? '',
          profiles
        ),
        truncated: scoped.truncated,
      },
      { headers: NO_STORE }
    )
  } catch (err) {
    return internalError('quadrants', err, 'Could not load the risk matrix.')
  }
}
