import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { isUuid } from '@/lib/student/assignments'

export const dynamic = 'force-dynamic'

/**
 * POST → `{ok: true}` (docs/TEACHER_SYSTEM_SPEC.md §3, member).
 *
 * The student leaves a class. The write is `leave_classroom()` under the
 * student's own session — no client role writes memberships (20260926a) — and
 * it flips only the caller's own ACTIVE row to `left`. That one flip is what
 * makes leaving take effect everywhere at once: teacher_student_ids and
 * user_classroom_ids stop returning the pair, so the teacher's reads of the
 * student's attempts fail closed and the class and its sets vanish from the
 * student's pages. Hand-ins already made stay with the teacher's set
 * (retention, spec §4); nothing is deleted.
 *
 * The membership is read first (the student may read their own rows, every
 * status) so a class they are not in is a 404 rather than a silent success.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Unauthorized' }, pendingCookies, { status: 401 })
  }
  const { id } = await params
  if (!isUuid(id)) {
    return jsonWithAuthCookies({ error: 'You are not in this class.' }, pendingCookies, { status: 404 })
  }
  const classroomId = id.toLowerCase()

  const { data: membership, error: readError } = await supabase
    .from('classroom_memberships')
    .select('status')
    .eq('classroom_id', classroomId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (readError) {
    console.error('[api/classrooms/leave] membership read failed', { message: readError.message })
    return jsonWithAuthCookies({ error: 'Could not leave the class. Try again.' }, pendingCookies, { status: 500 })
  }
  if (!membership || (membership as { status?: string }).status !== 'active') {
    return jsonWithAuthCookies({ error: 'You are not in this class.' }, pendingCookies, { status: 404 })
  }

  const { error } = await supabase.rpc('leave_classroom', { p_classroom_id: classroomId })
  if (error) {
    console.error('[api/classrooms/leave] rpc failed', { message: error.message })
    return jsonWithAuthCookies({ error: 'Could not leave the class. Try again.' }, pendingCookies, { status: 500 })
  }
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
