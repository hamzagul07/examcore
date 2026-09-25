import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NO_STORE, authorizeClassroomRoute, internalError, loadClassDue } from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET → `{ topics: CohortDueTopic[], students }` — syllabus topics cooling
 * off across the class (spaced review and lesson recall), in the class
 * subject, for work each student did since joining. The schedule tables have
 * no client policies, so they are read with the service client — only after
 * ownership is proven, and only for the class's active members.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response

  try {
    const due = await loadClassDue(auth.supabase, createServiceClient(), auth.classroom)
    return NextResponse.json(due, { headers: NO_STORE })
  } catch (err) {
    return internalError('due', err, 'Could not load the class due list.')
  }
}
