import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { auditLog } from '@/lib/teacher/notify'
import { isUuid, loadTeacherClassroom } from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'

/**
 * DELETE → `{ ok: true, status: 'removed' }` — the teacher removes a student
 * from the class (spec §3, §8).
 *
 * Removal is a status flip, never a row delete: the membership stays as the
 * record that the student was here (and when, and who removed them), and
 * teacher_student_ids drops them at once, so their attempts, hand-ins and
 * feedback become unreadable and unwritable for this teacher in one step.
 * Memberships are written only by the service role (CONTRACTS ruling 15), so
 * ownership and active membership are proven with the RLS client first.
 *
 * The student is told (a `class_removed` notification pointing at their
 * account page); they cannot rejoin with the code — that needs the teacher.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const { id, studentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })

  if (!isUuid(studentId)) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // membership_teacher_read lets the owner see every membership row of the class.
  const { data: membership, error: readError } = await supabase
    .from('classroom_memberships')
    .select('student_id, status')
    .eq('classroom_id', id)
    .eq('student_id', studentId)
    .maybeSingle()
  if (readError) {
    console.error('[teacher/remove] membership read failed:', readError.message)
    return NextResponse.json({ error: 'Could not check the class list. Try again.' }, { status: 500 })
  }
  if (!membership) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  if (membership.status !== 'active') {
    return NextResponse.json(
      { error: membership.status === 'left' ? 'This student already left the class.' : 'This student was already removed.' },
      { status: 409 }
    )
  }

  const admin = createServiceClient()
  const now = new Date().toISOString()
  const { data: updated, error } = await admin
    .from('classroom_memberships')
    .update({ status: 'removed', removed_at: now, removed_by: user.id })
    .eq('classroom_id', id)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .select('student_id')
  if (error) {
    console.error('[teacher/remove] update failed:', error.message)
    return NextResponse.json({ error: 'Could not remove the student. Try again.' }, { status: 500 })
  }
  if (!updated?.length) {
    // They left (or another tab removed them) between the read and the write.
    return NextResponse.json({ error: 'This student is no longer in the class.' }, { status: 409 })
  }

  await auditLog({
    actorId: user.id,
    classroomId: id,
    studentId,
    action: 'remove_student',
    meta: { classroom_name: classroom.name },
  })

  // Tell the student. A failed notification must not undo a removal that
  // already happened, so it is logged rather than returned.
  const { error: notifyError } = await admin.from('notifications').insert({
    user_id: studentId,
    type: 'class_removed',
    title: `You were removed from ${classroom.name}`,
    body: 'Your teacher can no longer see your work. Marks you earned while in the class stay yours.',
    href: '/account',
  })
  if (notifyError) console.error('[teacher/remove] notification failed:', notifyError.message)

  return NextResponse.json({ ok: true, status: 'removed' })
}
