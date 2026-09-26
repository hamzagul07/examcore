import { NextResponse } from 'next/server'
import { updateStudentFlags } from '@/lib/teacher/assignments'
import { isUuid, parseStudentFlagsPatch } from '@/lib/teacher/assignments/validate'
import { auditLog } from '@/lib/teacher/notify'
import { NO_STORE, authorizeAssignment, errorResponse, jsonError, readJson } from '../../../_lib/authorize'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; aid: string; sid: string }> }

/**
 * PATCH `{excused?, extended_due_at?, feedback?}` → `AssignmentStudentFlags`
 * for one active member. The note is plain text (HTML stripped, ≤2000); a
 * changed note is audited as `feedback` (spec §8) — it is the teacher writing
 * to a student.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id, aid, sid } = await params
  const auth = await authorizeAssignment(id, aid)
  if ('response' in auth) return auth.response
  if (!isUuid(sid)) return jsonError(404, 'That student is not in this class.', 'student')
  if (auth.classroom.archived_at) return jsonError(409, 'This class is archived.', 'classroom')
  if (auth.assignment.archived_at) return jsonError(409, 'This set was deleted.', 'assignment')

  const read = await readJson(request)
  if ('response' in read) return read.response
  const parsed = parseStudentFlagsPatch(read.body, auth.assignment)
  if (!parsed.ok) return jsonError(parsed.status ?? 400, parsed.error, parsed.field)

  try {
    const studentId = sid.toLowerCase()
    const { flags, feedbackChanged } = await updateStudentFlags(auth.supabase, auth.assignment, studentId, parsed.value)
    if (feedbackChanged) {
      await auditLog({
        actorId: auth.user.id,
        classroomId: auth.classroom.id,
        studentId,
        action: 'feedback',
        meta: { assignment_id: auth.assignment.id, scope: 'set_note', cleared: flags.feedback === null },
      })
    }
    return NextResponse.json(flags, { headers: NO_STORE })
  } catch (err) {
    return errorResponse(err, 'student flags', 'Could not save that change.')
  }
}
