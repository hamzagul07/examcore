import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher, verifyTeacherOwnsClassroom } from '@/lib/teacher-auth'
import { getClassroomStudentIds } from '@/lib/teacher-classroom-data'
import { buildStudentDueTopics } from '@/lib/teacher/cohort-due'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'

/**
 * One student's due topics — for the teacher student profile.
 * Membership + classroom ownership verified before the service-role read.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const { id, studentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) {
    return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })
  }

  const owns = await verifyTeacherOwnsClassroom(supabase, user.id, id)
  if (!owns) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
  }

  const studentIds = await getClassroomStudentIds(supabase, id)
  if (!studentIds.includes(studentId)) {
    return NextResponse.json({ error: 'Student not in this classroom' }, { status: 404 })
  }

  const service = createServiceClient()
  const { rows, error } = await loadDueRowsForStudents(service, [studentId])
  if (error) {
    console.error('[teacher/student-due]', error)
    return NextResponse.json({ error: 'Could not load due list' }, { status: 500 })
  }

  const topics = buildStudentDueTopics(
    rows.filter((r) => r.userId === studentId),
    10
  )

  return NextResponse.json({ topics, count: topics.length })
}
