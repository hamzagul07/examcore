import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  redirectWithAuthCookies,
} from '@/lib/supabase-server'
import { postOnboardingHref } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'

/**
 * After onboarding save, land here for a full-page redirect that refreshes
 * Supabase auth cookies before sending the user to /mark (or ?next=).
 */
export async function GET(request: NextRequest) {
  const nextRaw = request.nextUrl.searchParams.get('next')
  const destination = postOnboardingHref(nextRaw, '/mark')

  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (!user) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('next', destination)
    return redirectWithAuthCookies(signInUrl, pendingCookies)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  let onboarded = isOnboardingComplete(profile)

  if (!onboarded) {
    const service = createServiceClient()
    const { data: serviceProfile } = await service
      .from('user_profiles')
      .select('onboarded, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
    onboarded = isOnboardingComplete(serviceProfile)
  }

  if (!onboarded) {
    const onboardingUrl = new URL('/onboarding', request.url)
    onboardingUrl.searchParams.set('next', destination)
    return redirectWithAuthCookies(onboardingUrl, pendingCookies)
  }

  return redirectWithAuthCookies(new URL(destination, request.url), pendingCookies)
}
