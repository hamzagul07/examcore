import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { auditLog } from '@/lib/teacher/notify'
import {
  CLASSROOM_COLUMNS,
  classroomDeleteGuard,
  classroomUpdateFor,
  countActiveMembers,
  isUuid,
  loadTeacherClassroom,
  parseClassroomPatch,
  parseDeleteMode,
  toClassroomRow,
  type TeacherClassroomRow,
} from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * The route shape every teacher classroom route shares (spec §3): signed in
 * (401) → teacher role (403) → owns this classroom (404, the same answer for
 * "does not exist" and "not yours") → the RLS client. Returns the classroom
 * row, or the response to send.
 */
async function authorize(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  }
  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) {
    return { response: NextResponse.json({ error: 'Not a teacher' }, { status: 403 }) } as const
  }
  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) {
    return { response: NextResponse.json({ error: 'Classroom not found' }, { status: 404 }) } as const
  }
  return { supabase, user, classroom } as const
}

/** GET → `{ classroom, studentCount }` (active members). */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorize(id)
  if ('response' in auth) return auth.response
  return NextResponse.json(
    { classroom: auth.classroom, studentCount: auth.classroom.studentCount },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * PATCH `{name?, description?, board?, level?, subject_code?, year_group?,
 * settings?}` → `{classroom}`. Also `{archived: false}` to restore an archived
 * class — the undo for DELETE ?mode=archive.
 *
 * Settings are merged server-side so a form that only knows two toggles
 * cannot clear `demo`; free text is stored as plain text.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorize(id)
  if ('response' in auth) return auth.response
  const { supabase, user, classroom } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseClassroomPatch(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 })
  }

  const mapped = classroomUpdateFor(parsed.patch, classroom)
  if (!mapped.ok) {
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }

  const { data, error } = await supabase
    .from('classrooms')
    .update(mapped.update)
    .eq('id', id)
    .eq('teacher_id', user.id)
    .select(CLASSROOM_COLUMNS)
    .maybeSingle()

  if (error || !data) {
    console.error('[teacher/classroom] update failed:', error?.message ?? 'no row')
    return NextResponse.json({ error: 'Could not save the class. Try again.' }, { status: 500 })
  }

  if (parsed.patch.archived === false && classroom.archived_at) {
    // Restoring puts the class's students back into teacher_student_ids, i.e.
    // gives the teacher read access to their work again — an access change,
    // so it is audited alongside archiving (the action list has no separate
    // "restore"; `meta.restored` tells them apart).
    await auditLog({
      actorId: user.id,
      classroomId: id,
      action: 'archive_classroom',
      meta: { restored: true },
    })
  }

  return NextResponse.json({
    classroom: toClassroomRow(data as unknown as Parameters<typeof toClassroomRow>[0], classroom.studentCount),
  })
}

/**
 * DELETE `?mode=archive` (default) archives: the class leaves both RLS
 * helpers, so its students' live work is no longer readable and nobody can
 * join. `?mode=delete` deletes, and only an archived class with no active
 * members — the cascade takes every set and retained mark with it.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  const mode = parseDeleteMode(new URL(request.url).searchParams.get('mode'))
  if (!mode) {
    return NextResponse.json({ error: 'mode must be archive or delete', field: 'mode' }, { status: 400 })
  }

  const auth = await authorize(id)
  if ('response' in auth) return auth.response
  const { supabase, user, classroom } = auth

  if (mode === 'archive') {
    // Idempotent: archiving twice changes nothing and is not audited twice.
    if (classroom.archived_at) return NextResponse.json({ classroom })

    const { data, error } = await supabase
      .from('classrooms')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select(CLASSROOM_COLUMNS)
      .maybeSingle()
    if (error || !data) {
      console.error('[teacher/classroom] archive failed:', error?.message ?? 'no row')
      return NextResponse.json({ error: 'Could not archive the class. Try again.' }, { status: 500 })
    }
    await auditLog({
      actorId: user.id,
      classroomId: id,
      action: 'archive_classroom',
      meta: { name: classroom.name, active_members: classroom.studentCount },
    })
    const archived: TeacherClassroomRow = toClassroomRow(
      data as unknown as Parameters<typeof toClassroomRow>[0],
      classroom.studentCount
    )
    return NextResponse.json({ classroom: archived })
  }

  // Re-count now rather than trusting the page the teacher was looking at.
  let activeMembers: number
  try {
    activeMembers = (await countActiveMembers(supabase, [id])).get(id) ?? 0
  } catch (err) {
    console.error('[teacher/classroom] member count failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not check the class roster. Try again.' }, { status: 500 })
  }

  const guard = classroomDeleteGuard({ archived_at: classroom.archived_at, activeMembers })
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 409 })

  const { data: deleted, error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', id)
    .eq('teacher_id', user.id)
    .not('archived_at', 'is', null)
    .select('id')

  if (error) {
    console.error('[teacher/classroom] delete failed:', error.code, error.message)
    const blocked = error.code === '23503'
    return NextResponse.json(
      {
        error: blocked
          ? 'Something is still attached to this class, so it could not be deleted. Contact support and we will clear it.'
          : 'Could not delete the class. Try again.',
      },
      { status: blocked ? 409 : 500 }
    )
  }
  if (!deleted?.length) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
  }

  await auditLog({
    actorId: user.id,
    classroomId: id,
    action: 'delete_classroom',
    meta: { name: classroom.name, subject_code: classroom.subject_code },
  })

  return NextResponse.json({ deleted: true })
}
