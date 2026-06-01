import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  ENABLED_BOARD_IDS,
  ENABLED_LEVEL_IDS,
  ENABLED_SUBJECT_IDS,
} from '@/lib/profile-options'
import type { UserRole, PrimaryGoal, UserStage } from '@/lib/database.types'

type Body = {
  full_name?: string | null
  board?: string
  level?: string
  subjects?: string[]
  role?: UserRole
  classroom_name?: string
  stage?: UserStage
  primary_goal?: PrimaryGoal
  exam_date?: string | null
}

const VALID_STAGES = new Set<UserStage>(['as_level', 'a2_level', 'other'])
const VALID_GOALS = new Set<PrimaryGoal>([
  'mark_papers',
  'track_progress',
  'essay_feedback',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const role: UserRole = body.role === 'teacher' ? 'teacher' : 'student'
  const board = (body.board || '').trim() || 'Cambridge International'
  const level = (body.level || '').trim() || 'A-Level'
  const subjects =
    role === 'teacher'
      ? ['Mathematics']
      : Array.isArray(body.subjects)
        ? Array.from(
            new Set(body.subjects.map((s) => String(s).trim()).filter(Boolean))
          )
        : []

  if (role === 'student') {
    if (!ENABLED_BOARD_IDS.has(board)) {
      return NextResponse.json(
        { error: 'Pick a supported exam board.' },
        { status: 400 }
      )
    }
    if (!ENABLED_LEVEL_IDS.has(level)) {
      return NextResponse.json(
        { error: 'Pick a supported level.' },
        { status: 400 }
      )
    }
    if (subjects.length === 0) {
      return NextResponse.json(
        { error: 'Pick at least one subject.' },
        { status: 400 }
      )
    }
    if (subjects.length > 4) {
      return NextResponse.json(
        { error: 'Pick up to four subjects.' },
        { status: 400 }
      )
    }
    for (const s of subjects) {
      if (!ENABLED_SUBJECT_IDS.has(s)) {
        return NextResponse.json(
          { error: `Subject "${s}" is not supported yet.` },
          { status: 400 }
        )
      }
    }
  }

  const fullName =
    typeof body.full_name === 'string' && body.full_name.trim()
      ? body.full_name.trim().slice(0, 80)
      : null

  const stage = body.stage && VALID_STAGES.has(body.stage) ? body.stage : null
  const primaryGoal =
    body.primary_goal && VALID_GOALS.has(body.primary_goal)
      ? body.primary_goal
      : null

  let examDate: string | null = null
  if (typeof body.exam_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)) {
    examDate = body.exam_date
  }

  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      full_name: fullName,
      board,
      level,
      subjects,
      role,
      stage,
      primary_goal: primaryGoal,
      exam_date: examDate,
      onboarded: true,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[onboarding] upsert failed:', error)
    return NextResponse.json(
      { error: 'Could not save your profile. Try again in a moment.' },
      { status: 500 }
    )
  }

  if (role === 'teacher') {
    const classroomName = (body.classroom_name || '').trim()
    if (!classroomName) {
      return NextResponse.json(
        { error: 'Classroom name is required for teachers.' },
        { status: 400 }
      )
    }

    const { error: classroomError } = await supabase.from('classrooms').insert({
      teacher_id: user.id,
      name: classroomName.slice(0, 120),
      board,
      level,
      subject: 'Mathematics',
    })

    if (classroomError) {
      console.error('[onboarding] classroom create failed:', classroomError)
      return NextResponse.json(
        { error: 'Profile saved but classroom creation failed.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true, role })
}
