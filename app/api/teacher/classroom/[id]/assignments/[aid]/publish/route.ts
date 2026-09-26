import { NextResponse } from 'next/server'
import { publishAssignment } from '@/lib/teacher/assignments'
import { notifyAssignmentPublished } from '@/lib/teacher/notify'
import { NO_STORE, afterResponse, authorizeAssignment, errorResponse, jsonError } from '../../_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; aid: string }> }

/**
 * POST → `{assignment}` with `published_at` set, then the fan-out to students
 * after the response. Idempotent: publishing a published set returns it and
 * tells nobody again.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response
  if (auth.classroom.archived_at) {
    return jsonError(409, 'This class is archived — restore it in Settings to set new work.', 'classroom')
  }

  try {
    const { assignment, published } = await publishAssignment(auth.supabase, auth.assignment)
    if (published) await afterResponse(() => notifyAssignmentPublished(assignment.id))
    return NextResponse.json({ assignment }, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'publish', 'Could not publish the set.')
  }
}
