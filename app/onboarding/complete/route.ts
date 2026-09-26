import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  redirectWithAuthCookies,
} from '@/lib/supabase-server'
import { postOnboardingHref, resolveSameOriginUrl } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'

/**
 * Full-page hop after the onboarding save.
 *
 * The wizard saves through `POST /api/onboarding` on the cookie session and
 * then navigates here. A full navigation — not a client-side push — is what
 * lets the server refresh the Supabase auth cookies on the way out:
 * `authenticateRouteRequest` re-reads the session and any rotated tokens are
 * written back on the redirect. That is the whole of the "cookies lost after
 * onboarding" fix.
 *
 * This route used to *also* accept a signed `?token=` and mint a fresh session
 * for whichever user id the token named, with no cookie at all — a 4-hour
 * login credential sitting in browser history, proxy logs and screenshots
 * (review §1.2). It no longer does. No session means sign in; `completed=1`
 * lets the sign-in page say the profile was saved, nothing more.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const destination = postOnboardingHref(
    request.nextUrl.searchParams.get('next'),
    '/mark'
  )
  // The sink: never build a redirect from the raw parameter. `postOnboardingHref`
  // checks shape; this asks the URL parser whether it stays on this origin,
  // and the final redirect below carries the URL built here rather than a
  // path re-resolved against request.url (review §1.1, dot-segment case).
  const destinationUrl =
    resolveSameOriginUrl(destination, origin) ?? new URL('/mark', origin)
  const destinationPath = `${destinationUrl.pathname}${destinationUrl.search}${destinationUrl.hash}`

  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (!user) {
    const signInUrl = new URL('/auth/signin', origin)
    signInUrl.searchParams.set('next', destinationPath)
    signInUrl.searchParams.set('completed', '1')
    return redirectWithAuthCookies(signInUrl, pendingCookies)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!isOnboardingComplete(profile)) {
    const onboardingUrl = new URL('/onboarding', origin)
    onboardingUrl.searchParams.set('next', destinationPath)
    return redirectWithAuthCookies(onboardingUrl, pendingCookies)
  }

  return redirectWithAuthCookies(destinationUrl, pendingCookies)
}
