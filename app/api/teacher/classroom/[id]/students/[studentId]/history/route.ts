import { NextResponse } from 'next/server'
import { runAfterResponse } from '@/lib/after-response'
import { createServiceClient } from '@/lib/supabase/service'
import { decodeHistoryCursor } from '@/lib/teacher/insights/history'
import {
  NO_STORE,
  auditStudentView,
  authorizeClassroomRoute,
  internalError,
  jsonError,
  loadStudentHistory,
  loadStudentInClass,
} from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; studentId: string }> }

/**
 * GET `?cursor` → `{ attempts: StudentHistoryRow[], next_cursor }` — one
 * student's marked work in this class, newest first, 30 a page (keyset on
 * created_at, id). Only work marked since they joined and in the class
 * subject is listed; each row carries the set it was handed in to
 * (`assignment_item_id`, `set`) and the teacher's latest decision on it
 * (`decision`: confirm / override / flag).
 *
 * 404 unless the student is an active member of this class. Viewing is
 * written to the audit log as `view_student`, at most once per viewing
 * session (lib/teacher/insights/history.ts viewAuditDue), after the
 * response.
 */
export async function GET(request: Request, { params }: Params) {
  const { id, studentId } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, user, classroom } = auth

  const rawCursor = new URL(request.url).searchParams.get('cursor')
  const cursor = rawCursor ? decodeHistoryCursor(rawCursor) : null
  if (rawCursor && !cursor) return jsonError(400, 'That page of the history has expired — reload it.', 'cursor')

  try {
    const student = await loadStudentInClass(supabase, classroom.id, studentId)
    if (!student || student.member.status !== 'active') return jsonError(404, 'Student not in this classroom')

    const page = await loadStudentHistory(supabase, createServiceClient(), classroom, student.member, cursor)

    // An archived class shows no live work, so there is nothing to have viewed.
    if (!classroom.archived_at) {
      runAfterResponse('teacher view_student audit', () =>
        auditStudentView({
          actorId: user.id,
          classroomId: classroom.id,
          studentId: student.member.student_id,
          surface: 'history',
        })
      )
    }
    return NextResponse.json(page, { headers: NO_STORE })
  } catch (err) {
    return internalError('student history', err, 'Could not load this student’s work.')
  }
}
