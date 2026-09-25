import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import {
  saveOnboardingProfile,
  type OnboardingInput,
} from '@/lib/onboarding/save-profile'

/**
 * Old wizard tabs (loaded before the save token was removed) still post a
 * `saveToken` field. It is dropped, not rejected: their save should succeed
 * on the session alone, and nothing downstream may ever read it again.
 */
function withoutLegacyToken(body: Record<string, unknown>): OnboardingInput {
  const { saveToken, ...input } = body
  void saveToken
  return input as OnboardingInput
}

/**
 * Save the onboarding profile for the signed-in user.
 *
 * Auth is the cookie (or Bearer) session, full stop. This route used to also
 * accept a signed `saveToken` minted at page render and write the profile —
 * including `role: 'teacher'` — through the service client for whichever user
 * id the token named. The same token doubled as a 4-hour login credential in
 * a GET URL (review §1.2), so it is gone. The "session missing on the POST"
 * problem it papered over is handled the ordinary way: every reply carries
 * the refreshed auth cookies, and a genuine 401 sends the wizard to sign in.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  const result = await saveOnboardingProfile(
    supabase,
    user.id,
    withoutLegacyToken(body as Record<string, unknown>)
  )

  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, {
      status: result.status,
    })
  }

  return jsonWithAuthCookies({ ok: true, role: result.role }, pendingCookies)
}
