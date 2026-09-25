import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAssignmentWithItems, listAssignments } from '@/lib/teacher/assignments'
import { clampListLimit, parseListStatus } from '@/lib/teacher/assignments/list'
import { parseAssignmentDraft } from '@/lib/teacher/assignments/validate'
import { notifyAssignmentPublished } from '@/lib/teacher/notify'
import {
  NO_STORE,
  afterResponse,
  authorizeClassroom,
  errorResponse,
  jsonError,
  readJson,
} from './_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET `?status=open|closed|draft&cursor&limit` → `{assignments: AssignmentSummary[], next_cursor}`.
 * Keyset-paginated; deleted sets are on no tab (lib/teacher/assignments/list.ts).
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroom(id)
  if ('response' in auth) return auth.response

  const sp = new URL(request.url).searchParams
  const status = parseListStatus(sp.get('status'))
  if (status === null) return jsonError(400, 'status must be open, closed or draft.', 'status')

  try {
    const result = await listAssignments(auth.supabase, auth.classroom.id, {
      status,
      cursor: sp.get('cursor'),
      limit: clampListLimit(sp.get('limit')),
      // Retained hand-ins of an archived class are readable only as the service role.
      admin: auth.classroom.archived_at ? createServiceClient() : undefined,
    })
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'list', 'Could not load the sets.')
  }
}

/**
 * POST `AssignmentDraftInput` → 201 `{assignment, items}`. Items ≤ 12 after
 * topics are expanded; picked students must be active members; publishing
 * fans out to the students after the response.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroom(id)
  if ('response' in auth) return auth.response
  if (auth.classroom.archived_at) {
    return jsonError(409, 'This class is archived — restore it in Settings to set new work.', 'classroom')
  }

  const read = await readJson(request)
  if ('response' in read) return read.response
  // Validate before touching the bank: a bad title costs nothing.
  const parsed = parseAssignmentDraft(read.body)
  if (!parsed.ok) return jsonError(parsed.status ?? 400, parsed.error, parsed.field)

  try {
    const { assignment, items } = await createAssignmentWithItems(
      auth.supabase,
      createServiceClient(),
      { classroomId: auth.classroom.id, teacherId: auth.user.id, subjectCode: auth.classroom.subject_code },
      parsed.value
    )
    if (assignment.published_at) {
      await afterResponse(() => notifyAssignmentPublished(assignment.id))
    }
    return NextResponse.json({ assignment, items }, { status: 201, headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'create', 'Could not save the set. Nothing was published.')
  }
}
