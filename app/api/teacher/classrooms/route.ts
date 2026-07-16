import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function GET() {
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

  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select('id, name, description, invite_code, board, level, subject, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[teacher/classrooms] list failed:', error)
    return NextResponse.json({ error: 'Failed to load classrooms' }, { status: 500 })
  }

  // Single grouped read instead of one count query per classroom (N+1). Fetch
  // every membership for this teacher's classrooms in one round-trip and tally
  // in memory.
  const classroomList = classrooms || []
  const ids = classroomList.map((c) => c.id)
  const counts = new Map<string, number>()
  if (ids.length) {
    const { data: memberships, error: membershipError } = await supabase
      .from('classroom_memberships')
      .select('classroom_id')
      .in('classroom_id', ids)
    if (membershipError) {
      console.error('[teacher/classrooms] membership count failed:', membershipError)
    }
    for (const m of memberships ?? []) {
      counts.set(m.classroom_id, (counts.get(m.classroom_id) ?? 0) + 1)
    }
  }

  const withCounts = classroomList.map((c) => ({
    ...c,
    studentCount: counts.get(c.id) ?? 0,
  }))

  return NextResponse.json({ classrooms: withCounts })
}

type CreateBody = {
  name?: string
  description?: string
  board?: string
  level?: string
  subject?: string
}

export async function POST(request: Request) {
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

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  let classroom = null
  let attempts = 0
  const maxAttempts = 5

  while (!classroom && attempts < maxAttempts) {
    attempts++
    const inviteCode = generateInviteCode()

    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: user.id,
        name: name.slice(0, 120),
        description: body.description?.trim() || null,
        board: body.board?.trim() || 'Cambridge International',
        level: body.level?.trim() || 'A-Level',
        subject: body.subject?.trim() || 'Mathematics',
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (data) {
      classroom = data
      break
    }

    if (error?.code !== '23505' || !error.message.includes('invite_code')) {
      console.error('[teacher/classrooms] create failed:', error)
      return NextResponse.json(
        {
          error: 'Failed to create classroom',
          details: error?.message || 'Unknown error',
          code: error?.code,
        },
        { status: 500 }
      )
    }

    console.warn(`[teacher/classrooms] invite_code collision, retry ${attempts}`)
  }

  if (!classroom) {
    return NextResponse.json(
      { error: 'Could not generate unique invite code after retries' },
      { status: 500 }
    )
  }

  return NextResponse.json({ classroom })
}
