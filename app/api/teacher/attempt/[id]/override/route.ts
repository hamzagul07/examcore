import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/teacher-auth'
import { signAnswerPhotoUrl } from '@/lib/storage/answer-photos'

type Body = {
  override_marks_awarded?: unknown[]
  override_total_earned?: number
  teacher_notes?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
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

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, user_id, marks_earned, ai_marking')
    .eq('id', attemptId)
    .maybeSingle()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const overrideMarks = body.override_marks_awarded
  const overrideTotal = body.override_total_earned
  if (!Array.isArray(overrideMarks) || typeof overrideTotal !== 'number') {
    return NextResponse.json({ error: 'Invalid override payload' }, { status: 400 })
  }

  const aiMarking = attempt.ai_marking as {
    marks_awarded?: unknown[]
  } | null
  const originalMarks = aiMarking?.marks_awarded ?? []

  const { error: overrideError } = await supabase.from('teacher_overrides').insert({
    attempt_id: attemptId,
    teacher_id: user.id,
    original_marks_awarded: originalMarks,
    override_marks_awarded: overrideMarks,
    override_total_earned: overrideTotal,
    teacher_notes: body.teacher_notes?.trim() || null,
  })

  if (overrideError) {
    console.error('[teacher/override] insert failed:', overrideError)
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }

  const updatedAiMarking = {
    ...(aiMarking || {}),
    marks_awarded: overrideMarks,
    teacher_override: true,
    teacher_notes: body.teacher_notes?.trim() || null,
  }

  const { error: updateError } = await admin
    .from('attempts')
    .update({
      marks_earned: overrideTotal,
      ai_marking: updatedAiMarking,
    })
    .eq('id', attemptId)

  if (updateError) {
    console.error('[teacher/override] attempt update failed:', updateError)
    return NextResponse.json(
      { error: 'Override saved but attempt update failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    marks_earned: overrideTotal,
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params
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

  const { data: attempt } = await supabase
    .from('attempts')
    .select(
      'id, user_id, marks_earned, total_marks, question_text, ai_marking, answer_photo_url, line_references, syllabus_tags, created_at'
    )
    .eq('id', attemptId)
    .maybeSingle()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', attempt.user_id)
    .maybeSingle()

  const { data: overrides } = await supabase
    .from('teacher_overrides')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: false })

  const aiMarking = attempt.ai_marking as {
    marks_awarded?: Array<{
      mark_id: string | number
      earned: boolean
      reasoning?: string
    }>
  } | null

  return NextResponse.json({
    attempt: {
      ...attempt,
      answer_photo_url: attempt.answer_photo_url
        ? await signAnswerPhotoUrl(attempt.answer_photo_url)
        : attempt.answer_photo_url,
      marks_awarded: aiMarking?.marks_awarded ?? [],
      user_profiles: profile,
    },
    overrides: overrides || [],
  })
}
