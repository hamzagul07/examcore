import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  requireTeacher,
  verifyTeacherOwnsClassroom,
} from '@/lib/teacher-auth'

type Body = {
  title?: string
  target_syllabus_codes?: string[]
  question_ids?: string[]
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params
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

  const owns = await verifyTeacherOwnsClassroom(supabase, user.id, classroomId)
  if (!owns) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const targetCodes = Array.isArray(body.target_syllabus_codes)
    ? body.target_syllabus_codes.filter(Boolean)
    : []
  let questionIds = Array.isArray(body.question_ids)
    ? body.question_ids.filter(Boolean)
    : []

  if (targetCodes.length === 0) {
    return NextResponse.json(
      { error: 'At least one syllabus code is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  if (questionIds.length === 0) {
    for (const code of targetCodes.slice(0, 3)) {
      const { data } = await admin
        .from('mark_schemes')
        .select('id')
        .contains('syllabus_tags', [code])
        .gte('total_marks', 2)
        .lte('total_marks', 5)
        .limit(2)
      if (data) {
        questionIds.push(...data.map((q) => q.id))
      }
    }
  }

  questionIds = [...new Set(questionIds)].slice(0, 8)
  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: 'No matching questions found for those topics' },
      { status: 404 }
    )
  }

  const title =
    body.title?.trim() ||
    `Intervention: ${targetCodes.slice(0, 3).join(', ')}`

  const { data: test, error } = await supabase
    .from('intervention_tests')
    .insert({
      classroom_id: classroomId,
      teacher_id: user.id,
      target_syllabus_codes: targetCodes,
      question_ids: questionIds,
      title: title.slice(0, 200),
    })
    .select()
    .single()

  if (error || !test) {
    console.error('[teacher/intervention] create failed:', error)
    return NextResponse.json(
      { error: 'Failed to create intervention test' },
      { status: 500 }
    )
  }

  const { data: questions } = await admin
    .from('mark_schemes')
    .select(
      'id, question_text, total_marks, paper_code, paper_session, question_number, syllabus_tags'
    )
    .in('id', questionIds)

  return NextResponse.json({
    intervention: test,
    questions: questions || [],
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params
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

  const owns = await verifyTeacherOwnsClassroom(supabase, user.id, classroomId)
  if (!owns) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
  }

  const { data: tests } = await supabase
    .from('intervention_tests')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ interventions: tests || [] })
}
