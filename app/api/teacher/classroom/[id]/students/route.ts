import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  requireTeacher,
  verifyTeacherOwnsClassroom,
} from '@/lib/teacher-auth'
import { computeStudentQuadrants } from '@/lib/teacher-analytics'
import {
  getClassroomAttempts,
  getStudentProfiles,
} from '@/lib/teacher-classroom-data'

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

  const { studentIds, attempts } = await getClassroomAttempts(supabase, id)
  const profiles = await getStudentProfiles(supabase, studentIds)
  const metrics = computeStudentQuadrants(attempts, profiles)

  const students = studentIds.map((sid) => {
    const profile = profiles.get(sid)
    const metric = metrics.find((m) => m.studentId === sid)
    return {
      id: sid,
      name: profile?.full_name?.trim() || 'Student',
      accuracy: metric?.accuracy ?? 0,
      attemptCount: metric?.attemptCount ?? 0,
      predictedGrade: metric?.predictedGrade ?? '—',
      quadrant: metric?.quadrant ?? 'under_prepared',
      coverage: metric?.coverage ?? 0,
    }
  })

  return NextResponse.json({ students })
}
