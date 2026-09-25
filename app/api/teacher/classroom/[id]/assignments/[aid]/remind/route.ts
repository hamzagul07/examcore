import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { remindAssignment } from '@/lib/teacher/assignments'
import { parseRemindBody } from '@/lib/teacher/assignments/validate'
import { NO_STORE, authorizeAssignment, errorResponse, jsonError, readJson } from '../../_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; aid: string }> }

/**
 * POST `{student_ids?}` → `{sent, eligible}`. Reminds students who still owe
 * work on an open set (the picked ones, or everyone missing). Once per set
 * per six hours: 429 with Retry-After inside the window.
 */
export async function POST(request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response
  if (auth.classroom.archived_at) return jsonError(409, 'This class is archived.', 'classroom')

  const read = await readJson(request)
  if ('response' in read) return read.response
  const parsed = parseRemindBody(read.body)
  if (!parsed.ok) return jsonError(parsed.status ?? 400, parsed.error, parsed.field)

  try {
    const result = await remindAssignment(
      auth.supabase,
      createServiceClient(),
      auth.assignment,
      parsed.value.student_ids
    )
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'remind', 'Could not send the reminder.')
  }
}
