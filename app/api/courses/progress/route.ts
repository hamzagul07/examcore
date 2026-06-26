import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  sanitizeLastLesson,
  sanitizeProgressMap,
  type CloudCourseProgress,
} from '@/lib/courses/course-progress-cloud'

export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  const { data, error } = await supabase
    .from('course_progress')
    .select('progress, last_lesson, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[courses/progress] read failed:', error)
    return jsonWithAuthCookies(
      { error: 'Could not load course progress.' },
      pendingCookies,
      { status: 500 }
    )
  }

  const body: CloudCourseProgress = {
    progress: sanitizeProgressMap(data?.progress ?? {}),
    last_lesson: sanitizeLastLesson(data?.last_lesson),
    updated_at: data?.updated_at ?? null,
  }

  return jsonWithAuthCookies(body, pendingCookies)
}

export async function PUT(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw = body as { progress?: unknown; last_lesson?: unknown }
  const progress = sanitizeProgressMap(raw.progress ?? {})
  const last_lesson = sanitizeLastLesson(raw.last_lesson ?? null)

  const subjectCount = Object.keys(progress).length
  if (subjectCount > 80) {
    return NextResponse.json({ error: 'Too many subjects in progress payload.' }, { status: 400 })
  }

  const { error } = await supabase.from('course_progress').upsert(
    {
      user_id: user.id,
      progress,
      last_lesson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('[courses/progress] upsert failed:', error)
    return jsonWithAuthCookies(
      { error: 'Could not save course progress.' },
      pendingCookies,
      { status: 500 }
    )
  }

  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
