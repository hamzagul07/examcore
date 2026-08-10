import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  requireTeacher,
  verifyTeacherOwnsClassroom,
} from '@/lib/teacher-auth'
import { computeStudentQuadrants } from '@/lib/teacher-analytics'
import {
  getClassroomAttempts,
  getStudentProfiles,
} from '@/lib/teacher-classroom-data'
import { countDueByStudent } from '@/lib/teacher/cohort-due'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'

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

  // Due counts are best-effort: roster still renders if schedule tables fail.
  let dueByStudent: Record<string, number> = {}
  if (studentIds.length > 0) {
    const service = createServiceClient()
    const { rows, error } = await loadDueRowsForStudents(service, studentIds)
    if (error) {
      console.error('[teacher/students] due counts:', error)
    } else {
      dueByStudent = countDueByStudent(rows)
    }
  }

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
      dueCount: dueByStudent[sid] ?? 0,
    }
  })

  return NextResponse.json({ students })
}
