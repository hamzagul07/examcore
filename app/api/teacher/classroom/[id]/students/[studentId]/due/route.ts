import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  NO_STORE,
  authorizeClassroomRoute,
  internalError,
  jsonError,
  loadStudentDue,
  loadStudentInClass,
} from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; studentId: string }> }

/**
 * GET → `{ topics: StudentDueTopic[], count }` — one student's topics
 * cooling off, in the class subject, since they joined. 404 unless they are
 * an active member of this class: a student who left or was removed is no
 * longer the teacher's to see.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id, studentId } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response

  try {
    const student = await loadStudentInClass(auth.supabase, auth.classroom.id, studentId)
    if (!student || student.member.status !== 'active') return jsonError(404, 'Student not in this classroom')
    const topics = await loadStudentDue(createServiceClient(), auth.classroom, student.member)
    return NextResponse.json({ topics, count: topics.length }, { headers: NO_STORE })
  } catch (err) {
    return internalError('student due', err, 'Could not load due topics.')
  }
}
