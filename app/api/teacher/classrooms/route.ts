import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { generateInviteCode } from '@/lib/teacher/invite-code'
import { resolveClassroomSubjectCode } from '@/lib/teacher/subject'
import { BOARDS, IB_BOARD_ID, IB_DIPLOMA_LEVEL, LEVELS } from '@/lib/profile-options'
import {
  CLASS_DESCRIPTION_MAX,
  CLASS_NAME_MAX,
  CLASSROOM_COLUMNS,
  YEAR_GROUP_MAX,
  listTeacherClassrooms,
  plainText,
  toClassroomRow,
  type ClassroomScope,
} from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'

/**
 * GET `?scope=active|archived|all&cursor&limit` → `{ classrooms, next_cursor }`,
 * newest first, keyset-paginated.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const rawScope = url.searchParams.get('scope')
  const scope: ClassroomScope | null =
    rawScope === null || rawScope === '' || rawScope === 'active'
      ? 'active'
      : rawScope === 'archived' || rawScope === 'all'
        ? rawScope
        : null
  if (!scope) {
    return NextResponse.json({ error: 'scope must be active, archived or all', field: 'scope' }, { status: 400 })
  }

  const result = await listTeacherClassrooms(supabase, user.id, {
    scope,
    cursor: url.searchParams.get('cursor'),
    limit: Number(url.searchParams.get('limit') ?? '') || undefined,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(
    { classrooms: result.classrooms, next_cursor: result.next_cursor },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

type CreateBody = {
  name?: unknown
  description?: unknown
  board?: unknown
  level?: unknown
  subject?: unknown
  year_group?: unknown
}

const MAX_ATTEMPTS = 5

/**
 * POST `{ name, board, level, subject, description?, year_group? }` →
 * `{ classroom }`.
 *
 * The invite code comes from generateInviteCode() — six characters from an
 * alphabet with no 0/O or 1/I/L, because it is read aloud to a room — and a
 * collision on the unique index retries with a fresh one. The syllabus
 * (subject_code) is resolved from board / level / subject when that is
 * unambiguous; otherwise it stays null and class settings asks the teacher.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const name = plainText(body.name)
  if (!name) return NextResponse.json({ error: 'Give the class a name.', field: 'name' }, { status: 400 })
  if (name.length > CLASS_NAME_MAX) {
    return NextResponse.json(
      { error: `Keep the name under ${CLASS_NAME_MAX} characters.`, field: 'name' },
      { status: 400 }
    )
  }

  const description = body.description === undefined ? '' : plainText(body.description, { multiline: true })
  if (description === null || description.length > CLASS_DESCRIPTION_MAX) {
    return NextResponse.json(
      { error: `Keep the note under ${CLASS_DESCRIPTION_MAX} characters.`, field: 'description' },
      { status: 400 }
    )
  }

  const yearGroup = body.year_group === undefined ? '' : plainText(body.year_group)
  if (yearGroup === null || yearGroup.length > YEAR_GROUP_MAX) {
    return NextResponse.json(
      { error: `Keep the year group under ${YEAR_GROUP_MAX} characters.`, field: 'year_group' },
      { status: 400 }
    )
  }

  const board = typeof body.board === 'string' && body.board.trim() ? body.board.trim() : BOARDS[0].id
  if (!BOARDS.some((b) => b.enabled && b.id === board)) {
    return NextResponse.json({ error: 'Pick an exam board from the list.', field: 'board' }, { status: 400 })
  }
  const level =
    board === IB_BOARD_ID
      ? IB_DIPLOMA_LEVEL
      : typeof body.level === 'string' && body.level.trim()
        ? body.level.trim()
        : 'A-Level'
  if (!LEVELS.some((l) => l.enabled && l.id === level)) {
    return NextResponse.json({ error: 'Pick a level from the list.', field: 'level' }, { status: 400 })
  }
  const subject = plainText(body.subject)
  if (!subject || subject.length > 80) {
    return NextResponse.json({ error: 'Pick the subject you teach.', field: 'subject' }, { status: 400 })
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: user.id,
        name,
        description: description || null,
        board,
        level,
        subject,
        subject_code: resolveClassroomSubjectCode(board, level, subject),
        year_group: yearGroup || null,
        invite_code: generateInviteCode(),
      })
      .select(CLASSROOM_COLUMNS)
      .single()

    if (data) {
      return NextResponse.json({
        classroom: toClassroomRow(data as unknown as Parameters<typeof toClassroomRow>[0], 0),
      })
    }

    if (error?.code === '23505' && error.message.includes('invite_code')) {
      console.warn(`[teacher/classrooms] invite_code collision, retry ${attempt}`)
      continue
    }

    console.error('[teacher/classrooms] create failed:', error?.code, error?.message)
    return NextResponse.json({ error: 'Could not create the class. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ error: 'Could not make a unique invite code. Try again.' }, { status: 500 })
}
