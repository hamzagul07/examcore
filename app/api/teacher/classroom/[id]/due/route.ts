import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher, verifyTeacherOwnsClassroom } from '@/lib/teacher-auth'
import {
  getClassroomStudentIds,
  getStudentProfiles,
} from '@/lib/teacher-classroom-data'
import { buildCohortDueList } from '@/lib/teacher/cohort-due'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'
import { getSubjectByCode } from '@/lib/profile-options'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

/**
 * Class due list — topics cooling off across the roster.
 *
 * review_schedule / lesson_recall are service-role only (zero RLS policies).
 * Ownership of the classroom is verified before any read.
 */

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

  const studentIds = await getClassroomStudentIds(supabase, id)
  if (studentIds.length === 0) {
    return NextResponse.json({ topics: [], students: 0 })
  }

  const service = createServiceClient()
  const { rows, error } = await loadDueRowsForStudents(service, studentIds)
  if (error) {
    console.error('[teacher/due]', error)
    return NextResponse.json({ error: 'Could not load due list' }, { status: 500 })
  }

  const profiles = await getStudentProfiles(supabase, studentIds)
  const names: Record<string, string> = {}
  for (const [uid, p] of profiles) {
    const first = (p.full_name || '').trim().split(/\s+/)[0]
    names[uid] = first || 'Student'
  }

  const topicNames: Record<string, string> = {}
  const subjectLabels: Record<string, string> = {}
  for (const r of rows) {
    if (!subjectLabels[r.subjectCode]) {
      subjectLabels[r.subjectCode] =
        getSubjectByCode(r.subjectCode)?.label ?? r.subjectCode
    }
    const tk = `${r.subjectCode}::${r.topicCode}`
    if (!topicNames[tk]) {
      topicNames[tk] =
        getSyllabusTopicByCode(r.subjectCode, r.topicCode)?.name ?? r.topicCode
    }
  }

  const topics = buildCohortDueList({
    totalStudents: studentIds.length,
    rows,
    names,
    topicNames,
    subjectLabels,
    limit: 8,
  })

  return NextResponse.json({
    topics,
    students: studentIds.length,
  })
}
