import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { auditLog } from '@/lib/teacher/notify'
import { generateInviteCode } from '@/lib/teacher/invite-code'
import { isUuid, loadTeacherClassroom } from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5

/**
 * POST → `{ invite_code }` — a new code for the class; the old one stops
 * working at once (spec §3, §8: "codes regenerate instantly").
 *
 * This is what a teacher does when a code has leaked — posted in a public
 * group, photographed on a whiteboard — so it must never fail open: a
 * collision on the unique index retries with a fresh code, and anything else
 * is an error with the old code still in place. Students already in the
 * class are unaffected; only new joins need the new code.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })

  if (classroom.archived_at) {
    return NextResponse.json(
      { error: 'This class is archived, so nobody can join it. Restore it to get a new code.' },
      { status: 409 }
    )
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const code = generateInviteCode()
    const { data, error } = await supabase
      .from('classrooms')
      .update({ invite_code: code, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select('invite_code')
      .maybeSingle()

    if (data?.invite_code) {
      await auditLog({
        actorId: user.id,
        classroomId: id,
        action: 'regenerate_code',
        meta: { previous_code: classroom.invite_code },
      })
      return NextResponse.json({ invite_code: data.invite_code as string })
    }

    // 23505 = the unique index on invite_code: another class holds this one.
    if (error?.code === '23505') {
      console.warn(`[teacher/invite] code collision, retry ${attempt}`)
      continue
    }

    console.error('[teacher/invite] regenerate failed:', error?.message ?? 'no row')
    return NextResponse.json({ error: 'Could not make a new code. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ error: 'Could not make a unique code. Try again.' }, { status: 500 })
}
