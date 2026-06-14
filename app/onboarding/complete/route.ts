import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  redirectWithAuthCookies,
  type SupabaseAuthCookie,
} from '@/lib/supabase-server'
import { postOnboardingHref } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'
import {
  isProfileOnboardedForUser,
  restoreSessionForUserId,
} from '@/lib/onboarding/restore-session'
import { verifyOnboardingSaveToken } from '@/lib/onboarding/save-token'

function mergeCookies(...groups: SupabaseAuthCookie[][]): SupabaseAuthCookie[] {
  const merged = new Map<string, SupabaseAuthCookie>()
  for (const group of groups) {
    for (const cookie of group) {
      merged.set(cookie.name, cookie)
    }
  }
  return Array.from(merged.values())
}

/**
 * After onboarding save, land here for a full-page redirect that refreshes
 * Supabase auth cookies before sending the user to /mark (or ?next=).
 */
export async function GET(request: NextRequest) {
  const nextRaw = request.nextUrl.searchParams.get('next')
  const destination = postOnboardingHref(nextRaw, '/mark')
  const saveToken = request.nextUrl.searchParams.get('token')
  const destinationUrl = new URL(destination, request.url)

  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarded, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    let onboarded = isOnboardingComplete(profile)

    if (!onboarded) {
      onboarded = await isProfileOnboardedForUser(user.id)
    }

    if (!onboarded) {
      const onboardingUrl = new URL('/onboarding', request.url)
      onboardingUrl.searchParams.set('next', destination)
      return redirectWithAuthCookies(onboardingUrl, pendingCookies)
    }

    return redirectWithAuthCookies(destinationUrl, pendingCookies)
  }

  const verified = verifyOnboardingSaveToken(saveToken)
  if (!verified) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('next', destination)
    return redirectWithAuthCookies(signInUrl, pendingCookies)
  }

  const onboarded = await isProfileOnboardedForUser(verified.userId)
  if (!onboarded) {
    const onboardingUrl = new URL('/onboarding', request.url)
    onboardingUrl.searchParams.set('next', destination)
    return redirectWithAuthCookies(onboardingUrl, pendingCookies)
  }

  const restored = await restoreSessionForUserId(
    request,
    verified.userId,
    destinationUrl.toString()
  )

  if (restored.ok) {
    return redirectWithAuthCookies(
      destinationUrl,
      mergeCookies(pendingCookies, restored.pendingCookies)
    )
  }

  const signInUrl = new URL('/auth/signin', request.url)
  signInUrl.searchParams.set('next', destination)
  signInUrl.searchParams.set('completed', '1')
  return redirectWithAuthCookies(signInUrl, pendingCookies)
}
