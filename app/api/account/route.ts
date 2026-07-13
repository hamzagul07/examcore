import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  ENABLED_BOARD_IDS,
  ENABLED_LEVEL_IDS,
  IB_DIPLOMA_LEVEL,
  isIbBoard,
  isSubjectValidForProfile,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'

type Body = {
  full_name?: string | null
  board?: string
  level?: string
  subjects?: string[]
  exam_date?: string | null
  stage?: UserStage | null
  primary_goal?: PrimaryGoal | null
}

const VALID_STAGES = new Set<UserStage>(['as_level', 'a2_level', 'other'])
const VALID_GOALS = new Set<PrimaryGoal>([
  'mark_papers',
  'track_progress',
  'essay_feedback',
])

export async function POST(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const board = (body.board || '').trim()
  let level = (body.level || '').trim()
  if (isIbBoard(board)) {
    level = IB_DIPLOMA_LEVEL
  }
  const subjects = Array.isArray(body.subjects)
    ? Array.from(new Set(body.subjects.map((s) => String(s).trim()).filter(Boolean)))
    : []

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
    if (!isSubjectValidForProfile(board, level, s)) {
      return NextResponse.json(
        { error: `Subject "${s}" is not supported for ${board} ${level} yet.` },
        { status: 400 }
      )
    }
  }

  // Only fields present in the request body are written — an omitted key keeps
  // its stored value. (Always writing exam_date used to wipe the user's exam
  // date whenever another settings form saved.)
  const patch: Record<string, unknown> = {
    id: user.id,
    board,
    level,
    subjects,
    onboarded: true,
    updated_at: new Date().toISOString(),
  }

  if ('full_name' in body) {
    patch.full_name =
      typeof body.full_name === 'string' && body.full_name.trim()
        ? body.full_name.trim().slice(0, 80)
        : null
  }

  if ('exam_date' in body) {
    if (body.exam_date === null || body.exam_date === '') {
      patch.exam_date = null
    } else if (
      typeof body.exam_date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)
    ) {
      patch.exam_date = body.exam_date
    }
  }

  if ('stage' in body) {
    if (body.stage !== null && !VALID_STAGES.has(body.stage as UserStage)) {
      return NextResponse.json({ error: 'Pick a valid study stage.' }, { status: 400 })
    }
    patch.stage = body.stage
  }

  if ('primary_goal' in body) {
    if (
      body.primary_goal !== null &&
      !VALID_GOALS.has(body.primary_goal as PrimaryGoal)
    ) {
      return NextResponse.json({ error: 'Pick a valid goal.' }, { status: 400 })
    }
    patch.primary_goal = body.primary_goal
  }

  // Account edits should not silently un-onboard a user. Preserve onboarded=true
  // (which is also our gate for /onboarding redirects).
  const { error } = await supabase
    .from('user_profiles')
    .upsert(patch, { onConflict: 'id' })

  if (error) {
    console.error('[account] upsert failed:', error)
    return NextResponse.json(
      { error: 'Could not save your changes. Try again in a moment.' },
      { status: 500 }
    )
  }

  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
