import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  collectAttemptPhotoRefs,
  normalizePhotoRef,
  signAnswerPhotoUrl,
} from '@/lib/storage/answer-photos'
import { requireTeacher } from '@/lib/teacher-auth'

export const dynamic = 'force-dynamic'

/**
 * Refresh signed URLs for answer photos (expire after ~1h).
 * Supports whole-paper multi-page ink via optional `ref` (storage path or URL).
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const attemptId = params.get('attempt_id')
  const refParam = params.get('ref')

  if (!attemptId) {
    return NextResponse.json({ error: 'attempt_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createServiceClient()
  const { data: attempt, error } = await admin
    .from('attempts')
    .select('user_id, answer_photo_url, ai_marking')
    .eq('id', attemptId)
    .maybeSingle()

  if (error || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Guest marks (user_id null) refresh via attempt id only — UUID is unguessable.
  if (attempt.user_id) {
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    const isOwner = attempt.user_id === user.id
    if (!isOwner) {
      const teacherCheck = await requireTeacher(supabase, user.id)
      if (!teacherCheck.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  const allowedRefs = collectAttemptPhotoRefs(attempt)
  const targetRef = refParam
    ? normalizePhotoRef(decodeURIComponent(refParam))
    : attempt.answer_photo_url
      ? normalizePhotoRef(attempt.answer_photo_url)
      : null

  if (!targetRef || !allowedRefs.has(targetRef)) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const url = await signAnswerPhotoUrl(targetRef)
  if (!url) {
    return NextResponse.json({ error: 'Could not sign photo URL' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
