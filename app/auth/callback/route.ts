import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  redirectWithAuthCookies,
} from '@/lib/supabase-server'
import { resolvePostAuthPath } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'
import { handlePostAuthEmails } from '@/lib/email/notifications'
import { runAfterResponse } from '@/lib/after-response'
import { claimUsernameFromMetadata } from '@/lib/community/claim-username'
import { CREATOR_REF_COOKIE, parseCreatorRef } from '@/lib/creators/codes'
import { claimCreatorRef } from '@/lib/creators/service'

/**
 * Lands here after a magic-link click, password-signup confirmation, or
 * password reset. Exchanges the auth code for a session, then routes:
 *   - to `?next=` if provided (e.g. /auth/reset-password for recovery flow),
 *   - to /onboarding for new users who haven't completed onboarding yet,
 *   - to /dashboard otherwise.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const oauthError = requestUrl.searchParams.get('error')
  const oauthDescription = requestUrl.searchParams.get('error_description')

  if (oauthError) {
    const params = new URLSearchParams({ error: 'auth_failed' })
    if (oauthDescription) {
      params.set('detail', oauthDescription.slice(0, 200))
    }
    return redirectWithAuthCookies(
      `${requestUrl.origin}/auth/signin?${params.toString()}`,
      []
    )
  }

  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')

  if (!code) {
    return redirectWithAuthCookies(
      `${requestUrl.origin}/auth/signin?error=missing_code`,
      []
    )
  }

  const { supabase, pendingCookies } = await authenticateRouteRequest(request)

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError)
    return redirectWithAuthCookies(
      `${requestUrl.origin}/auth/signin?error=auth_failed`,
      pendingCookies
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectWithAuthCookies(
      `${requestUrl.origin}/auth/signin?error=session_lost`,
      pendingCookies
    )
  }

  const admin = createServiceClient()
  runAfterResponse('post-auth-emails', () => handlePostAuthEmails(admin, user))

  // Claim the username chosen at sign-up (stored in user_metadata).
  await claimUsernameFromMetadata(
    user.id,
    (user.user_metadata as { username?: string } | undefined)?.username
  )

  // Creator attribution (docs/CREATORS_PROGRAM.md): the cookie the proxy set
  // when this person landed on a creator's space or a ?code= link. Writes
  // referred_by once and pays the gift once; a stale or unknown ref is silent.
  const creatorRef = parseCreatorRef(request.cookies.get(CREATOR_REF_COOKIE)?.value)
  if (creatorRef) {
    try {
      await claimCreatorRef({ userId: user.id, ref: creatorRef })
    } catch (err) {
      console.warn('[auth/callback] creator claim failed', err)
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const destination = resolvePostAuthPath(onboarded, nextParam)

  return redirectWithAuthCookies(
    `${requestUrl.origin}${destination}`,
    pendingCookies
  )
}
