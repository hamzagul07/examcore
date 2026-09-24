import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { parseReadingPrefs, type ReadingPrefs } from '@/lib/courses/reading-prefs'

type Body = {
  email_exam_reminders?: boolean
  email_product_updates?: boolean
  email_community_replies?: boolean
  email_community_digest?: boolean
  email_community_threads?: boolean
  email_review_digest?: boolean
  email_weekly_report?: boolean
  email_mark_ready?: boolean
  email_creator_brief?: boolean
  /** Lesson typography (typeface, size, spacing) — synced across devices. */
  reading_prefs?: unknown
}

/** The signed-in reader's saved lesson typography, for the lesson page to sync from. */
export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })
  }
  const { data } = await supabase
    .from('user_profiles')
    .select('reading_prefs')
    .eq('id', user.id)
    .maybeSingle()
  const raw = data?.reading_prefs as unknown
  const reading_prefs: ReadingPrefs | null = raw ? parseReadingPrefs(JSON.stringify(raw)) : null
  return jsonWithAuthCookies({ reading_prefs }, pendingCookies)
}

export async function PATCH(request: NextRequest) {
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

  const patch: Record<string, boolean | ReadingPrefs> = {}
  if (body.reading_prefs && typeof body.reading_prefs === 'object') {
    // Parsed, not stored raw: only known typefaces, sizes and a boolean land.
    patch.reading_prefs = parseReadingPrefs(JSON.stringify(body.reading_prefs))
  }
  if (typeof body.email_exam_reminders === 'boolean') {
    patch.email_exam_reminders = body.email_exam_reminders
  }
  if (typeof body.email_product_updates === 'boolean') {
    patch.email_product_updates = body.email_product_updates
  }
  if (typeof body.email_community_replies === 'boolean') {
    patch.email_community_replies = body.email_community_replies
  }
  if (typeof body.email_community_digest === 'boolean') {
    patch.email_community_digest = body.email_community_digest
  }
  if (typeof body.email_community_threads === 'boolean') {
    patch.email_community_threads = body.email_community_threads
  }
  if (typeof body.email_review_digest === 'boolean') {
    patch.email_review_digest = body.email_review_digest
  }
  if (typeof body.email_weekly_report === 'boolean') {
    patch.email_weekly_report = body.email_weekly_report
  }
  if (typeof body.email_mark_ready === 'boolean') {
    patch.email_mark_ready = body.email_mark_ready
  }
  if (typeof body.email_creator_brief === 'boolean') {
    patch.email_creator_brief = body.email_creator_brief
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  // Upsert, not update: 45 accounts have no user_profiles row yet — a profile
  // is written at onboarding, and nothing stops someone signing in and going
  // straight to the community. An UPDATE against a missing row matches nothing
  // and reports no error, so the reply was `ok: true` and the preference was
  // silently dropped. For an email opt-in that means telling somebody we had
  // recorded their consent when we had not.
  //
  // Safe under RLS ("Users insert own profile") and under the column grants:
  // every field written here is insertable by `authenticated`. `role` is
  // deliberately absent — its grant is revoked, and including it would make
  // PostgREST reject the whole statement.
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) {
    console.error('[account/preferences] update failed:', error)
    return NextResponse.json(
      { error: 'Could not save your preferences. Try again in a moment.' },
      { status: 500 }
    )
  }

  return jsonWithAuthCookies({ ok: true, ...patch }, pendingCookies)
}
