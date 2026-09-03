import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** What the Desk shows when it does not ask for a size. */
const DEFAULT_ATTEMPTS_LIMIT = 50
/** Upper bound, so a hand-written `?limit=100000` cannot ask for everything. */
const MAX_ATTEMPTS_LIMIT = 100

/**
 * The signed-in student's marked attempts, newest first.
 *
 * Exists for the mobile app's Desk tab (until now it could only show marks
 * made on that device, from AsyncStorage); the web dashboard server-renders
 * its own history and does not use this. Bearer auth works out of the box —
 * authenticateRouteRequest falls back to the Authorization header after
 * cookies — and the RLS-scoped client means the query can only ever see the
 * caller's own rows.
 */
export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in required' }, pendingCookies, {
      status: 401,
    })
  }

  // `Number(null)` is 0, not NaN. Reading the parameter straight into Number()
  // therefore made an ABSENT `?limit` finite, clamp to 1, and return a single
  // attempt — the Desk asked for a history and got one row, with no error to
  // show for it. The 50 default only ever applied to garbage like `?limit=abc`.
  // Read the raw string first so "not supplied" and "supplied as junk" are the
  // same case, and both land on the default.
  const rawLimit = request.nextUrl.searchParams.get('limit')?.trim()
  const parsedLimit = rawLimit ? Number(rawLimit) : Number.NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.trunc(parsedLimit), 1), MAX_ATTEMPTS_LIMIT)
    : DEFAULT_ATTEMPTS_LIMIT

  const { data, error } = await supabase
    .from('attempts')
    .select(
      `
      id, created_at, marks_earned, total_marks, syllabus_tags, question_text,
      mark_schemes ( paper_code, paper_session, question_number )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[attempts] list failed:', error.message)
    return jsonWithAuthCookies(
      { error: 'Could not load attempts' },
      pendingCookies,
      { status: 500 }
    )
  }

  const attempts = (data ?? []).map((a) => {
    const scheme = Array.isArray(a.mark_schemes) ? a.mark_schemes[0] : a.mark_schemes
    return {
      id: a.id,
      created_at: a.created_at,
      earned: a.marks_earned,
      total: a.total_marks,
      subject: Array.isArray(a.syllabus_tags) ? (a.syllabus_tags[0] ?? null) : null,
      paper: scheme?.paper_code ?? null,
      session: scheme?.paper_session ?? null,
      question_number: scheme?.question_number ?? null,
      // A one-line reminder of what the question was — not the full text.
      question_preview: a.question_text ? String(a.question_text).slice(0, 140) : null,
    }
  })

  return jsonWithAuthCookies({ attempts }, pendingCookies, { status: 200 })
}
