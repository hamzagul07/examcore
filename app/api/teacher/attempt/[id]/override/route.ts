import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/teacher-auth'
import { signAnswerPhotoUrl } from '@/lib/storage/answer-photos'
import {
  mergeOverrideMarks,
  resolveOriginalMarks,
  validateOverride,
} from '@/lib/teacher/override'

/**
 * POST — apply a teacher's override to an attempt.
 *
 * The payload is validated against the attempt's own maximum before anything
 * is written (lib/teacher/override.ts): the previous `Array.isArray` +
 * `typeof number` check let a negative or over-maximum total and an
 * arbitrary marks array straight through to `attempts`, which feeds mastery,
 * the weekly report and the student's Omni prompt. Validation failures are
 * 422 with per-field errors; the success body is unchanged.
 */
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

  // RLS (teacher_read_student_attempts) scopes this read to the teacher's own
  // students, so a hit here is also the authorisation check.
  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, user_id, marks_earned, total_marks, ai_marking')
    .eq('id', attemptId)
    .maybeSingle()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const aiMarking = (
    attempt.ai_marking && typeof attempt.ai_marking === 'object'
      ? attempt.ai_marking
      : {}
  ) as Record<string, unknown>

  // The stored entries go in with the payload so the validator can tell the
  // marker's own (unbounded) reasoning, echoed back by the console, from text
  // the teacher actually wrote. Without them a verbose marker made every
  // override of that attempt a 422.
  const validated = validateOverride(body, {
    total_marks: attempt.total_marks,
    marks_awarded: aiMarking.marks_awarded,
  })
  if (!validated.ok) {
    return NextResponse.json(
      { error: 'Invalid override payload', errors: validated.errors },
      { status: 422 }
    )
  }
  const { total: overrideTotal, marks: overrideMarks, notes: teacherNotes } = validated.value

  // The audit row's "original" must be the marker's result, not the previous
  // teacher's. It is snapshotted into ai_marking.original_marks_awarded on the
  // first override; an attempt overridden before that snapshot existed still
  // has the true original on its earliest audit row.
  let earliestOriginal: unknown = null
  if (aiMarking.teacher_override === true && !Array.isArray(aiMarking.original_marks_awarded)) {
    const { data: earliest } = await supabase
      .from('teacher_overrides')
      .select('original_marks_awarded')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    earliestOriginal = earliest?.original_marks_awarded ?? null
  }
  const { original: originalMarks, persistSnapshot, firstOverride } = resolveOriginalMarks(
    aiMarking,
    earliestOriginal
  )

  // Stored entries keep the marker's own line references (the ink overlay
  // needs them) under the teacher's validated fields; every entry carries
  // teacher_override so the Omni prompt fences it as teacher-supplied data.
  const storedMarks = mergeOverrideMarks(aiMarking.marks_awarded, overrideMarks)

  const { error: overrideError } = await supabase.from('teacher_overrides').insert({
    attempt_id: attemptId,
    teacher_id: user.id,
    original_marks_awarded: originalMarks,
    override_marks_awarded: storedMarks,
    override_total_earned: overrideTotal,
    teacher_notes: teacherNotes,
  })

  if (overrideError) {
    console.error('[teacher/override] insert failed:', overrideError)
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }

  const updatedAiMarking: Record<string, unknown> = {
    ...aiMarking,
    marks_awarded: storedMarks,
    teacher_override: true,
    teacher_notes: teacherNotes,
  }
  if (persistSnapshot) {
    updatedAiMarking.original_marks_awarded = originalMarks
  }
  if (firstOverride) {
    // The marker's total, kept alongside its marks so the AI score survives
    // the overwrite of marks_earned below.
    updatedAiMarking.original_marks_earned = attempt.marks_earned
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
    ink_pages?: Array<{ photo_url: string; line_references?: unknown[] }>
  } | null

  // The full multi-page script (all page photos + per-page ink) lives in
  // ai_marking.ink_pages — sign each so the reviewer sees every page, not just
  // page 1 (answer_photo_url).
  const signedInkPages = Array.isArray(aiMarking?.ink_pages)
    ? (
        await Promise.all(
          aiMarking.ink_pages.map(async (p) => {
            const url = await signAnswerPhotoUrl(p.photo_url)
            return url
              ? { photo_url: url, line_references: p.line_references ?? [] }
              : null
          })
        )
      ).filter(
        (p): p is { photo_url: string; line_references: unknown[] } => !!p
      )
    : []

  return NextResponse.json({
    attempt: {
      ...attempt,
      answer_photo_url: attempt.answer_photo_url
        ? await signAnswerPhotoUrl(attempt.answer_photo_url)
        : attempt.answer_photo_url,
      ink_pages: signedInkPages,
      marks_awarded: aiMarking?.marks_awarded ?? [],
      user_profiles: profile,
    },
    overrides: overrides || [],
  })
}
