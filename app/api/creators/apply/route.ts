import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { validateUsername } from '@/lib/community/username'
import { runAfterResponse } from '@/lib/after-response'
import { notifyAdminCreatorApplication } from '@/lib/email/creator-seat'

const AUDIENCE_SIZES = new Set(['under_1k', '1k_10k', '10k_50k', '50k_plus'])

/**
 * A creator asks for a space (docs/CREATORS_PROGRAM.md). One pending
 * application per account; the founder reviews it in /admin/creators, and
 * approval grants the seat through lib/creators/grant.ts.
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in first.' }, pendingCookies, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON body' }, pendingCookies, { status: 400 })
  }
  const str = (k: string, max: number) =>
    typeof body[k] === 'string' ? (body[k] as string).trim().slice(0, max) : ''

  const handleCheck = validateUsername(str('handle', 40).replace(/^@/, ''))
  if (!handleCheck.ok) {
    return jsonWithAuthCookies(
      { error: 'Pick a handle of 3–20 lowercase letters, digits or underscores.' },
      pendingCookies,
      { status: 400 }
    )
  }
  const displayName = str('displayName', 60)
  if (displayName.length < 2) {
    return jsonWithAuthCookies({ error: 'Tell us what to call you.' }, pendingCookies, { status: 400 })
  }
  const tiktok = str('tiktok', 120) || null
  const instagram = str('instagram', 120) || null
  const youtube = str('youtube', 120) || null
  if (!tiktok && !instagram && !youtube) {
    return jsonWithAuthCookies(
      { error: 'Add at least one channel so we can look at what you post.' },
      pendingCookies,
      { status: 400 }
    )
  }
  const audienceRaw = str('audienceSize', 20)
  const audienceSize = AUDIENCE_SIZES.has(audienceRaw) ? audienceRaw : null

  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('creators')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    return jsonWithAuthCookies({ error: 'You already have a creator seat.' }, pendingCookies, { status: 409 })
  }

  const row = {
    user_id: user.id,
    handle_wanted: handleCheck.username,
    display_name: displayName,
    tagline: str('tagline', 160) || null,
    tiktok,
    instagram,
    youtube,
    exams: str('exams', 120) || null,
    audience_size: audienceSize,
    is_adult: body.isAdult === true,
    message: str('message', 1000) || null,
  }
  const { error } = await admin.from('creator_applications').insert(row)
  if (error) {
    if (error.code === '23505') {
      return jsonWithAuthCookies({ ok: true, status: 'pending' }, pendingCookies)
    }
    console.error('[creators] application insert failed', error.message)
    return jsonWithAuthCookies({ error: 'Could not save the application. Try again.' }, pendingCookies, { status: 500 })
  }

  runAfterResponse('creator-application-notify', async () =>
    notifyAdminCreatorApplication({
      accountEmail: user.email ?? null,
      handleWanted: row.handle_wanted,
      displayName: row.display_name,
      tiktok,
      instagram,
      youtube,
      exams: row.exams,
      audienceSize: row.audience_size,
      isAdult: row.is_adult,
      message: row.message,
    })
  )
  return jsonWithAuthCookies({ ok: true, status: 'pending' }, pendingCookies)
}
