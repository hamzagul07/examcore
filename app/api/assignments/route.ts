import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { StudentInputError, clampDoneLimit, loadStudentAssignments } from '@/lib/student/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'

export const dynamic = 'force-dynamic'

/** A student's own sets: never cached anywhere but their browser. */
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * GET `?cursor&limit` → `{open: StudentAssignment[], done: StudentAssignment[], next_cursor}`
 * (docs/TEACHER_SYSTEM_SPEC.md §3).
 *
 * `open` is everything still to do and is not paged (it is bounded by what is
 * open right now); `done` is keyset-paged, most recent first. Every read is
 * the student's own RLS client, so a set only appears while they are an active
 * member of a live class and it is published to them.
 */
export async function GET(req: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Unauthorized' }, pendingCookies, { status: 401, headers: NO_STORE })
  }
  if (!isTeacherV2()) {
    return jsonWithAuthCookies({ error: 'Not found' }, pendingCookies, { status: 404, headers: NO_STORE })
  }

  const sp = req.nextUrl.searchParams
  try {
    const list = await loadStudentAssignments(supabase, user.id, {
      cursor: sp.get('cursor'),
      limit: clampDoneLimit(sp.get('limit')),
    })
    return jsonWithAuthCookies(list, pendingCookies, { headers: NO_STORE })
  } catch (err) {
    if (err instanceof StudentInputError) {
      return jsonWithAuthCookies({ error: err.message, field: err.field }, pendingCookies, {
        status: 400,
        headers: NO_STORE,
      })
    }
    console.error('[api/assignments] list failed', err instanceof Error ? err.message : err)
    return jsonWithAuthCookies({ error: 'Could not load your sets. Try again.' }, pendingCookies, {
      status: 500,
      headers: NO_STORE,
    })
  }
}
