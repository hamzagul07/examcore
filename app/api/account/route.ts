import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  ENABLED_BOARD_IDS,
  ENABLED_LEVEL_IDS,
  ENABLED_SUBJECT_IDS,
} from '@/lib/profile-options'

type Body = {
  full_name?: string | null
  board?: string
  level?: string
  subjects?: string[]
}

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

  const board = (body.board || '').trim()
  const level = (body.level || '').trim()
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
  for (const s of subjects) {
    if (!ENABLED_SUBJECT_IDS.has(s)) {
      return NextResponse.json(
        { error: `Subject "${s}" is not supported yet.` },
        { status: 400 }
      )
    }
  }

  const fullName =
    typeof body.full_name === 'string' && body.full_name.trim()
      ? body.full_name.trim().slice(0, 80)
      : null

  // Account edits should not silently un-onboard a user. Preserve onboarded=true
  // (which is also our gate for /onboarding redirects).
  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        board,
        level,
        subjects,
        onboarded: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('[account] upsert failed:', error)
    return NextResponse.json(
      { error: 'Could not save your changes. Try again in a moment.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
