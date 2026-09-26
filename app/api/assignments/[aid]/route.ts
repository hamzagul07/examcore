import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { isUuid, loadStudentAssignment } from '@/lib/student/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * GET → `{assignment, classroom, summary, items: [{...item, mark_href, submission, state}], flags, feedback, class_average}`
 * (docs/TEACHER_SYSTEM_SPEC.md §3, member only).
 *
 * Visibility is decided by the student's RLS read of the set; a set they may
 * not see (another class, a class they left, a deleted set, one targeted at
 * other students) is a 404 that does not say which. The service client is
 * only used after that read succeeded — for the teacher's display name,
 * question previews and, when the class allows it, the class average.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Unauthorized' }, pendingCookies, { status: 401, headers: NO_STORE })
  }
  const { aid } = await params
  if (!isTeacherV2() || !isUuid(aid)) {
    return jsonWithAuthCookies({ error: 'Set not found' }, pendingCookies, { status: 404, headers: NO_STORE })
  }

  try {
    const detail = await loadStudentAssignment(supabase, createServiceClient(), user.id, aid)
    if (!detail) {
      return jsonWithAuthCookies({ error: 'Set not found' }, pendingCookies, { status: 404, headers: NO_STORE })
    }
    return jsonWithAuthCookies(detail, pendingCookies, { headers: NO_STORE })
  } catch (err) {
    console.error('[api/assignments/[aid]] load failed', err instanceof Error ? err.message : err)
    return jsonWithAuthCookies({ error: 'Could not load this set. Try again.' }, pendingCookies, {
      status: 500,
      headers: NO_STORE,
    })
  }
}
