import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  archiveAssignment,
  loadAssignment,
  reconcileAssignment,
  updateAssignment,
} from '@/lib/teacher/assignments'
import { parseAssignmentPatch } from '@/lib/teacher/assignments/validate'
import { NO_STORE, authorizeAssignment, errorResponse, jsonError, readJson } from '../_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; aid: string }> }

/**
 * GET → `{assignment, items, progress}`. Marks the class made from plain /mark
 * on the set's questions are reconciled first (at most once a minute per set);
 * a reconcile failure is logged and the set is shown as it stands.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response

  const admin = createServiceClient()
  try {
    await reconcileAssignment(admin, auth.assignment.id)
  } catch (err) {
    console.error('[teacher/assignments] reconcile failed (showing the set as stored)', {
      assignmentId: auth.assignment.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    const loaded = await loadAssignment(auth.supabase, admin, auth.assignment.id)
    if (!loaded) return jsonError(404, 'Set not found')
    return NextResponse.json(loaded, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'load', 'Could not load the set.')
  }
}

/**
 * PATCH `{title?, instructions?, due_at?, closed_at?, is_mock?, settings?, items?}`
 * → `{assignment, items}`. Items only while the set is a draft (409 after);
 * `closed_at: null` reopens a closed set.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response
  if (auth.assignment.archived_at) return jsonError(409, 'This set was deleted.', 'assignment')
  if (auth.classroom.archived_at) {
    return jsonError(409, 'This class is archived — restore it in Settings to change its sets.', 'classroom')
  }

  const read = await readJson(request)
  if ('response' in read) return read.response
  const parsed = parseAssignmentPatch(read.body, auth.assignment)
  if (!parsed.ok) return jsonError(parsed.status ?? 400, parsed.error, parsed.field)

  try {
    const result = await updateAssignment(auth.supabase, createServiceClient(), auth.assignment, parsed.value)
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'update', 'Could not save your changes.')
  }
}

/** DELETE → `{assignment}` with `archived_at` set: off every list, hand-ins kept. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id, aid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response

  try {
    const assignment = await archiveAssignment(auth.supabase, auth.assignment)
    return NextResponse.json({ assignment }, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'delete', 'Could not delete the set.')
  }
}
