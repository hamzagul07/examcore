import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATINGS = ['up', 'down'] as const
const REASONS = [
  'too_harsh',
  'too_generous',
  'misread_my_work',
  'wrong_mark_scheme',
  'unclear_feedback',
  'other',
] as const

type Rating = (typeof RATINGS)[number]
type Reason = (typeof REASONS)[number]

const MAX_COMMENT_LENGTH = 1000
const MAX_DISPLAY_NAME_LENGTH = 60

/**
 * Record a student's verdict on one mark.
 *
 * This is the only direct read we have on whether the marking is any good —
 * scores alone can't distinguish "harsh but correct" from "wrong". It is also
 * the source for testimonials, which is why `share_consent` is captured
 * explicitly and never inferred from a positive rating.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const attemptId = typeof body.attempt_id === 'string' ? body.attempt_id : null
  const rating = body.rating as Rating
  if (!attemptId) {
    return NextResponse.json({ error: 'attempt_id is required' }, { status: 400 })
  }
  if (!RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'rating must be "up" or "down"' }, { status: 400 })
  }

  const reason =
    typeof body.reason === 'string' && REASONS.includes(body.reason as Reason)
      ? (body.reason as Reason)
      : null
  const comment =
    typeof body.comment === 'string' && body.comment.trim()
      ? body.comment.trim().slice(0, MAX_COMMENT_LENGTH)
      : null
  const shareConsent = body.share_consent === true
  const displayName =
    typeof body.display_name === 'string' && body.display_name.trim()
      ? body.display_name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH)
      : null

  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies(
      { error: 'Sign in to leave feedback' },
      pendingCookies,
      { status: 401 }
    )
  }

  // Ownership check — feedback is only meaningful from the person who was
  // marked, and this stops one user rating another's attempt.
  const { data: attempt } = await supabaseAdmin
    .from('attempts')
    .select('id, user_id, marks_earned, total_marks, syllabus_tags, ai_marking')
    .eq('id', attemptId)
    .maybeSingle()

  if (!attempt || attempt.user_id !== user.id) {
    return jsonWithAuthCookies(
      { error: 'Attempt not found' },
      pendingCookies,
      { status: 404 }
    )
  }

  const markingMode =
    attempt.ai_marking &&
    typeof attempt.ai_marking === 'object' &&
    'marking_style' in attempt.ai_marking
      ? String((attempt.ai_marking as Record<string, unknown>).marking_style)
      : null

  // Upsert on attempt_id: changing your mind revises the verdict rather than
  // adding a second one, so the fair-rate isn't skewed by repeat submissions.
  const { error } = await supabaseAdmin
    .from('mark_feedback')
    .upsert(
      {
        attempt_id: attemptId,
        user_id: user.id,
        rating,
        reason,
        comment,
        share_consent: shareConsent,
        display_name: shareConsent ? displayName : null,
        marks_earned: attempt.marks_earned,
        total_marks: attempt.total_marks,
        marking_mode: markingMode,
        subject_code: Array.isArray(attempt.syllabus_tags)
          ? (attempt.syllabus_tags[0] ?? null)
          : null,
        // A revised rating goes back into the approval queue — an approved
        // quote must never survive the user changing their mind about it.
        approved_at: null,
      },
      { onConflict: 'attempt_id' }
    )

  if (error) {
    console.error('[mark/feedback] upsert failed:', error.message)
    return jsonWithAuthCookies(
      { error: 'Could not save your feedback' },
      pendingCookies,
      { status: 500 }
    )
  }

  // Revising feedback clears `approved_at` (above), so an already-published
  // quote must stop rendering now — not up to an hour later when the homepage
  // cache happens to expire. Consent withdrawal has to be immediate.
  // Two-arg form: Next 16 deprecated `revalidateTag(tag)`. 'max' marks the tag
  // stale so the homepage refetches on its next visit.
  revalidateTag('testimonials', 'max')

  if (rating === 'down') {
    // Surface unfair marks in logs immediately — these are the ones worth
    // reading by hand while the volume is still small enough to do so.
    console.warn('[mark/feedback] marked unfair', {
      attempt_id: attemptId,
      reason,
      has_comment: !!comment,
    })
  }

  return jsonWithAuthCookies({ ok: true }, pendingCookies, { status: 200 })
}
