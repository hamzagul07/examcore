import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  requireTeacher,
  verifyTeacherOwnsClassroom,
} from '@/lib/teacher-auth'
import { summarizeClassAnalytics } from '@/lib/teacher-analytics'
import { getClassroomAttempts } from '@/lib/teacher-classroom-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name')
    .eq('id', id)
    .single()

  const { studentIds, attempts } = await getClassroomAttempts(supabase, id)
  const summary = summarizeClassAnalytics(attempts, studentIds.length)

  return NextResponse.json({
    classroomName: classroom?.name ?? 'Classroom',
    ...summary,
  })
}
