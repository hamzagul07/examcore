import { NextRequest, NextResponse } from 'next/server'
import { contentSubjectCode } from '@/lib/courses/board'
import { getCourseLesson } from '@/lib/courses'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { nextRecallInterval, DAY_MS } from '@/lib/courses/recall-schedule'

/**
 * Records that a signed-in student completed a lesson's quick check, so the
 * lesson can resurface for spaced recall.
 *
 * Guests are a no-op, not an error: quick check works signed-out (drafts live in
 * localStorage) and should not nag for an account to keep functioning. They
 * simply get no scheduling.
 *
 * Nothing the client sends is trusted beyond identifying the lesson — the topic
 * code is read from the lesson on disk, and the answered/total counts are
 * clamped to the lesson's real question count so a crafted request cannot
 * inflate an interval.
 */

export const maxDuration = 15

type RecallBody = {
  subjectCode?: string
  lessonSlug?: string
  answered?: number
  total?: number
}

/**
 * Content lives under the prefixed code ("ib-biology-hl") but the canonical IB
 * route passes the catalog slug ("biology-hl"). `contentSubjectCode` normalises
 * either shape, so the lookup happens once instead of try-then-try-prefixed.
 */
function resolveLesson(subjectCode: string, lessonSlug: string) {
  const code = contentSubjectCode(subjectCode)
  const lesson = getCourseLesson(code, lessonSlug)
  return lesson ? { code, lesson } : null
}

export async function POST(req: NextRequest) {
  let body: RecallBody
  try {
    body = (await req.json()) as RecallBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subjectCode = (body.subjectCode || '').trim()
  const lessonSlug = (body.lessonSlug || '').trim()
  if (!subjectCode || !lessonSlug) {
    return NextResponse.json({ error: 'Missing subjectCode or lessonSlug' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Signed-out is a successful no-op — see the note above.
  if (!user) return NextResponse.json({ recorded: false, reason: 'guest' })

  const resolved = resolveLesson(subjectCode, lessonSlug)
  if (!resolved) return NextResponse.json({ error: 'Unknown lesson' }, { status: 404 })
  const { code: contentCode, lesson } = resolved

  const realTotal = lesson.quickCheck?.length ?? 0
  if (realTotal === 0) {
    return NextResponse.json({ recorded: false, reason: 'no-quick-check' })
  }
  const total = realTotal
  const answered = Math.max(0, Math.min(Math.floor(body.answered ?? 0), total))

  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('lesson_recall')
    .select('interval_days')
    .eq('user_id', user.id)
    .eq('subject_code', contentCode)
    .eq('lesson_slug', lessonSlug)
    .maybeSingle()

  const interval = nextRecallInterval(existing?.interval_days ?? 3, answered, total)
  const now = Date.now()

  const { error } = await admin.from('lesson_recall').upsert(
    {
      user_id: user.id,
      subject_code: contentCode,
      lesson_slug: lessonSlug,
      topic_code: lesson.topicCode,
      answered_count: answered,
      total_count: total,
      interval_days: interval,
      due_at: new Date(now + interval * DAY_MS).toISOString(),
      last_worked_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: 'user_id,subject_code,lesson_slug' }
  )

  if (error) {
    console.error('[courses/recall] upsert failed:', error)
    return NextResponse.json({ error: 'Could not record' }, { status: 500 })
  }

  return NextResponse.json({ recorded: true, intervalDays: interval })
}
