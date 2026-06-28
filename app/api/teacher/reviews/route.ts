import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher, verifyTeacherOwnsClassroom } from '@/lib/teacher-auth'
import { getClassroomStudentIds } from '@/lib/teacher-classroom-data'

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const classroomId = searchParams.get('classroom_id')

  // A supplied classroom_id must belong to the requesting teacher — otherwise
  // a teacher could read another teacher's classroom roster.
  if (classroomId) {
    const owns = await verifyTeacherOwnsClassroom(supabase, user.id, classroomId)
    if (!owns) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id')
    .eq('teacher_id', user.id)

  const classroomIds = classroomId
    ? [classroomId]
    : (classrooms || []).map((c) => c.id)

  if (classroomIds.length === 0) {
    return NextResponse.json({ reviews: [] })
  }

  const allStudentIds: string[] = []
  for (const cid of classroomIds) {
    const ids = await getClassroomStudentIds(supabase, cid)
    allStudentIds.push(...ids)
  }

  const uniqueStudentIds = [...new Set(allStudentIds)]
  if (uniqueStudentIds.length === 0) {
    return NextResponse.json({ reviews: [] })
  }

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, user_id, marks_earned, total_marks, question_text, created_at, ai_marking'
    )
    .in('user_id', uniqueStudentIds)
    .not('ai_marking', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', uniqueStudentIds)

  const nameById = new Map(
    (profiles || []).map((p) => [p.id, p.full_name?.trim() || 'Student'])
  )

  const attemptIds = (attempts || []).map((a) => a.id)
  const { data: overrides } = await supabase
    .from('teacher_overrides')
    .select('attempt_id')
    .in(
      'attempt_id',
      attemptIds.length ? attemptIds : ['00000000-0000-0000-0000-000000000000']
    )

  const overriddenSet = new Set((overrides || []).map((o) => o.attempt_id))

  const reviews = (attempts || []).map((a) => ({
    id: a.id,
    studentName: nameById.get(a.user_id) || 'Student',
    questionPreview: (a.question_text || 'Marked submission').slice(0, 80),
    marksEarned: a.marks_earned,
    totalMarks: a.total_marks,
    createdAt: a.created_at,
    overridden: overriddenSet.has(a.id),
  }))

  return NextResponse.json({ reviews })
}
