import { createServiceClient } from '@/lib/supabase/service'
import { signAnswerPhotoUrl } from '@/lib/storage/answer-photos'
import { auditLog, onOverrideSaved } from '@/lib/teacher/notify'
import { buildDecisionWrite, validateDecision } from '@/lib/teacher/override-validate'
import { loadAttemptReview, resolveReviewScope } from '@/lib/teacher/reviews-query'
import {
  authorizeTeacher,
  isCheckViolation,
  isRlsViolation,
  jsonError,
  jsonOk,
  readJson,
  serverError,
} from '../../_lib/http'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/** attempts numerics can arrive as strings (numeric columns); null for anything unreadable. */
function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * GET → one script for review: the attempt (signed photos, every ink page,
 * its per-mark list), the calling teacher's decisions and notes on it, and
 * the student's name via teacher_student_profiles — never a direct read of
 * another user's profile row (spec §8).
 *
 * 404 unless the script is one the teacher may review: an active member's
 * work in one of their live classes, marked since joining, in the class's
 * subject or handed in against its set (lib/teacher/reviews-query.ts).
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeTeacher()
  if ('response' in auth) return auth.response

  try {
    const admin = createServiceClient()
    const review = await loadAttemptReview(auth.supabase, admin, auth.user.id, id, {
      signPhoto: (stored) => signAnswerPhotoUrl(stored),
    })
    if (!review) return jsonError(404, 'Attempt not found')

    const firstPage = review.ink[0] ?? null
    return jsonOk({
      attempt: {
        id: review.attempt.id,
        user_id: review.attempt.student_id,
        created_at: review.attempt.created_at,
        marks_earned: review.attempt.marks_earned,
        total_marks: review.attempt.total_marks,
        ai_marks_earned: review.attempt.ai_marks_earned,
        teacher_override: review.attempt.teacher_override,
        question_text: review.attempt.question_text,
        answer_photo_url: firstPage?.photo_url ?? null,
        line_references: firstPage?.line_references ?? [],
        ink_pages: review.ink,
        marking: review.attempt.marking,
        marks_awarded: review.attempt.marks,
        judgement: review.attempt.judgement,
      },
      display_name: review.student.display_name,
      student_name: review.student.full_name,
      classroom_id: review.classroom.id,
      assignment_id: review.set?.id ?? null,
      work_label: review.work_label,
      overrides: review.decisions,
      feedback: review.feedback,
    })
  } catch (err) {
    return serverError('review', { attemptId: id }, err, 'Could not load this script.')
  }
}

/**
 * POST `{decision, override_marks_awarded?, override_total_earned?,
 * reasoning_note?, student_visible?}` → `{marks_earned, decision, override_id}`.
 *
 * Validation is lib/teacher/override-validate.ts (spec §6); every refusal is
 * `400 {error, field}`. Then, in order:
 *
 *   1. The AI snapshot and the chain: the attempt's earliest and latest
 *      teacher_overrides rows, read with the service client because another
 *      teacher's rows are invisible under RLS and the snapshot must be the
 *      marker's result, not whoever decided first in THIS teacher's view.
 *   2. The decision row, inserted with the teacher's own client so the
 *      policy's WITH CHECK (an attempt of one of their CURRENT students)
 *      still applies at the moment of writing.
 *   3. Override only: the service update of `attempts` (clients hold no
 *      UPDATE on it). If that fails the row is removed again, so the audit
 *      trail never records a mark the student does not have.
 *   4. onOverrideSaved (hand-in marked 'reviewed' with the new mark; the
 *      student is told when the decision is student_visible) and the
 *      `override` audit row. Both are awaited — neither throws — so the
 *      set's matrix is right by the time the teacher gets back to it.
 *
 * confirm / flag never touch `attempts`.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeTeacher()
  if ('response' in auth) return auth.response
  const { supabase, user } = auth

  const read = await readJson(request)
  if ('response' in read) return read.response

  let admin: ReturnType<typeof createServiceClient>
  let scope: Awaited<ReturnType<typeof resolveReviewScope>>
  try {
    admin = createServiceClient()
    scope = await resolveReviewScope(supabase, admin, user.id, id)
  } catch (err) {
    return serverError('override', { attemptId: id }, err, 'Could not load this script.')
  }
  if (!scope) return jsonError(404, 'Attempt not found')
  const { row: attempt, classroom } = scope

  const validated = validateDecision(read.body, {
    marks_earned: attempt.marks_earned,
    total_marks: attempt.total_marks,
    ai_marking: attempt.ai_marking,
  })
  if (!validated.ok) return jsonError(400, validated.error, validated.field)
  const decision = validated.value

  const [earliestRes, latestRes] = await Promise.all([
    admin
      .from('teacher_overrides')
      .select('original_marks_awarded')
      .eq('attempt_id', attempt.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from('teacher_overrides')
      .select('id')
      .eq('attempt_id', attempt.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (earliestRes.error || latestRes.error) {
    return serverError(
      'override',
      { attemptId: attempt.id, step: 'history' },
      earliestRes.error ?? latestRes.error,
      'Could not save the decision. Try again.'
    )
  }

  const write = buildDecisionWrite({
    decision,
    attempt: { id: attempt.id, marks_earned: attempt.marks_earned, ai_marking: attempt.ai_marking },
    teacherId: user.id,
    classroomId: classroom.id,
    earliestOriginal: (earliestRes.data as { original_marks_awarded?: unknown } | null)?.original_marks_awarded ?? null,
    previousId: (latestRes.data as { id?: string } | null)?.id ?? null,
  })

  const { data: inserted, error: insertError } = await supabase
    .from('teacher_overrides')
    .insert(write.row)
    .select('id')
    .single()
  if (insertError || !inserted) {
    // The student left or was removed between the read and the write.
    if (isRlsViolation(insertError)) return jsonError(404, 'Attempt not found')
    if (isCheckViolation(insertError)) {
      return jsonError(400, 'The note is too long — keep it to 1,000 characters.', 'reasoning_note')
    }
    return serverError('override', { attemptId: attempt.id, step: 'insert' }, insertError, 'Could not save the decision. Try again.')
  }
  const overrideId = (inserted as { id: string }).id

  if (write.attemptUpdate) {
    const { error: updateError } = await admin.from('attempts').update(write.attemptUpdate).eq('id', attempt.id)
    if (updateError) {
      const { error: undoError } = await supabase.from('teacher_overrides').delete().eq('id', overrideId)
      if (undoError) {
        console.error('[teacher/override] could not remove the row after a failed attempt update', {
          overrideId,
          error: undoError.message,
        })
      }
      return serverError(
        'override',
        { attemptId: attempt.id, step: 'attempt-update' },
        updateError,
        'Could not save the new mark. Try again.'
      )
    }
  }

  await Promise.all([
    onOverrideSaved(attempt.id),
    auditLog({
      actorId: user.id,
      classroomId: classroom.id,
      studentId: attempt.user_id,
      action: 'override',
      meta: {
        attempt_id: attempt.id,
        override_id: overrideId,
        decision: decision.decision,
        marks_before: toNumber(attempt.marks_earned),
        marks_after: write.marksEarnedAfter,
        total_marks: toNumber(attempt.total_marks),
        student_visible: decision.student_visible,
        ...(scope.set ? { assignment_id: scope.set.id } : {}),
      },
    }),
  ])

  return jsonOk({ marks_earned: write.marksEarnedAfter, decision: decision.decision, override_id: overrideId })
}
