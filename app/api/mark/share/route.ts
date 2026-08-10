import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  createMarkShareToken,
  markShareUrl,
} from '@/lib/marking/share-token'

export const maxDuration = 15

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Issue a durable public report URL for an attempt the caller owns.
 * Guests with user_id null can still share if they present the attempt id
 * from their just-finished mark (no PII beyond the score slip).
 */
export async function POST(request: NextRequest) {
  try {
    let attemptId: string | undefined
    let subjectCode: string | null = null
    let paperRef: string | null = null
    try {
      const body = await request.json()
      attemptId =
        typeof body?.attempt_id === 'string' ? body.attempt_id.trim() : undefined
      subjectCode =
        typeof body?.subject_code === 'string' ? body.subject_code.trim() : null
      paperRef =
        typeof body?.paper_ref === 'string' ? body.paper_ref.trim() : null
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!attemptId || !UUID_RE.test(attemptId)) {
      return NextResponse.json(
        { error: 'attempt_id is required' },
        { status: 400 }
      )
    }

    const { user, pendingCookies } = await authenticateRouteRequest(request)

    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('id, user_id, marks_earned, total_marks')
      .eq('id', attemptId)
      .maybeSingle()

    if (error || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Owner can always share. Guest attempts (user_id null) are shareable by
    // anyone who knows the id — ids are unguessable UUIDs minted at mark time.
    if (attempt.user_id && (!user || attempt.user_id !== user.id)) {
      return jsonWithAuthCookies({ error: 'Forbidden' }, pendingCookies, {
        status: 403,
      })
    }

    if (!(Number(attempt.total_marks) > 0)) {
      return NextResponse.json(
        { error: 'This attempt has no score to share yet.' },
        { status: 400 }
      )
    }

    const token = createMarkShareToken(attempt.id, { subjectCode, paperRef })
    return jsonWithAuthCookies(
      { token, url: markShareUrl(token) },
      pendingCookies
    )
  } catch (err) {
    console.error('[mark/share]', err)
    return NextResponse.json(
      { error: 'Could not create a share link. Try again.' },
      { status: 500 }
    )
  }
}
