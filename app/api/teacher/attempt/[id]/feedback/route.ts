import { createServiceClient } from '@/lib/supabase/service'
import {
  FEEDBACK_NOTIFICATION_WINDOW_MS,
  parseFeedbackDelete,
  parseFeedbackPost,
} from '@/lib/teacher/feedback'
import { attemptHref, auditLog, feedbackNotificationCopy, onFeedbackSaved } from '@/lib/teacher/notify'
import { resolveReviewScope } from '@/lib/teacher/reviews-query'
import type { TeacherFeedback } from '@/lib/teacher/types'
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

const FEEDBACK_COLUMNS = 'id, attempt_id, student_id, teacher_id, classroom_id, body, created_at, read_at'

/**
 * POST `{body, classroom_id?}` → `201 {feedback}` — a written note from the
 * teacher to the student on this script (spec §3, §5).
 *
 * The script must be one the teacher may review (resolveReviewScope: an
 * active member's work in one of their live classes — so the student is in
 * teacher_student_ids). The note is plain text (lib/teacher/feedback.ts).
 * `classroom_id`, when sent, must be one of those live classes; otherwise
 * the script's own class is recorded. The insert runs under the teacher's
 * RLS client, whose WITH CHECK re-proves the student and the attempt at the
 * moment of writing. Then the student is told (onFeedbackSaved) and the
 * write is audited as `feedback` — its length, never its text.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeTeacher()
  if ('response' in auth) return auth.response
  const { supabase, user } = auth

  const read = await readJson(request)
  if ('response' in read) return read.response
  const parsed = parseFeedbackPost(read.body)
  if (!parsed.ok) return jsonError(400, parsed.error, parsed.field)

  let scope: Awaited<ReturnType<typeof resolveReviewScope>>
  try {
    scope = await resolveReviewScope(supabase, createServiceClient(), user.id, id)
  } catch (err) {
    return serverError('feedback', { attemptId: id }, err, 'Could not load this script.')
  }
  if (!scope) return jsonError(404, 'Attempt not found')

  const classroomId = parsed.value.classroom_id ?? scope.classroom.id
  if (!scope.memberClassIds.includes(classroomId)) {
    return jsonError(400, 'That student is not in that class.', 'classroom_id')
  }

  const { data, error } = await supabase
    .from('teacher_feedback')
    .insert({
      attempt_id: scope.row.id,
      student_id: scope.row.user_id,
      teacher_id: user.id,
      classroom_id: classroomId,
      body: parsed.value.body,
    })
    .select(FEEDBACK_COLUMNS)
    .single()
  if (error || !data) {
    if (isRlsViolation(error)) return jsonError(404, 'Attempt not found')
    if (isCheckViolation(error)) return jsonError(400, 'That note is too long — keep it to 2,000 characters.', 'body')
    return serverError('feedback', { attemptId: scope.row.id, step: 'insert' }, error, 'Could not send the note. Try again.')
  }
  const feedback = data as TeacherFeedback

  await Promise.all([
    onFeedbackSaved(feedback.id),
    auditLog({
      actorId: user.id,
      classroomId,
      studentId: scope.row.user_id,
      action: 'feedback',
      meta: { attempt_id: scope.row.id, feedback_id: feedback.id, chars: feedback.body.length },
    }),
  ])

  return jsonOk({ feedback }, 201)
}

/**
 * DELETE `{id}` (or `?id=`) → `{ok: true, id}` — the teacher withdraws one
 * of their own notes on this script. Also how a note is edited: the composer
 * posts the new text first, then deletes the old note.
 *
 * The student's `teacher_feedback` notification quotes the note, so it is
 * retracted too — only the one written for this note (same student, script
 * and quoted text, within an hour of it). An email already sent cannot be.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeTeacher()
  if ('response' in auth) return auth.response
  const { supabase, user } = auth

  const read = await readJson(request)
  if ('response' in read) return read.response
  const queryId = new URL(request.url).searchParams.get('id')
  const parsed = parseFeedbackDelete(read.body ?? (queryId ? { id: queryId } : undefined))
  if (!parsed.ok) return jsonError(400, parsed.error, parsed.field)

  let admin: ReturnType<typeof createServiceClient>
  let scope: Awaited<ReturnType<typeof resolveReviewScope>>
  try {
    admin = createServiceClient()
    scope = await resolveReviewScope(supabase, admin, user.id, id)
  } catch (err) {
    return serverError('feedback', { attemptId: id }, err, 'Could not load this script.')
  }
  if (!scope) return jsonError(404, 'Attempt not found')

  const { data, error } = await supabase
    .from('teacher_feedback')
    .delete()
    .eq('id', parsed.value.id)
    .eq('attempt_id', scope.row.id)
    .eq('teacher_id', user.id)
    .select(FEEDBACK_COLUMNS)
  if (error) {
    return serverError('feedback', { attemptId: scope.row.id, step: 'delete' }, error, 'Could not delete the note. Try again.')
  }
  const removed = ((data ?? []) as TeacherFeedback[])[0]
  if (!removed) return jsonError(404, 'Note not found', 'id')

  const createdMs = Date.parse(removed.created_at)
  if (Number.isFinite(createdMs)) {
    const quoted = feedbackNotificationCopy({ teacherName: '', workLabel: null, body: removed.body }).body
    const { error: retractError } = await admin
      .from('notifications')
      .delete()
      .eq('user_id', removed.student_id)
      .eq('type', 'teacher_feedback')
      .eq('href', attemptHref(removed.attempt_id))
      .eq('body', quoted)
      .gte('created_at', new Date(createdMs).toISOString())
      .lte('created_at', new Date(createdMs + FEEDBACK_NOTIFICATION_WINDOW_MS).toISOString())
    if (retractError) {
      console.error('[teacher/feedback] notification retraction failed', {
        feedbackId: removed.id,
        error: retractError.message,
      })
    }
  }

  await Promise.all([
    onFeedbackSaved(removed.id),
    auditLog({
      actorId: user.id,
      classroomId: removed.classroom_id,
      studentId: removed.student_id,
      action: 'feedback',
      meta: { attempt_id: removed.attempt_id, feedback_id: removed.id, deleted: true },
    }),
  ])

  return jsonOk({ ok: true, id: removed.id })
}
