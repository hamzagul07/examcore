import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePostAuthPath } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'
import { handlePostAuthEmails } from '@/lib/email/notifications'

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
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/signin?${params.toString()}`
    )
  }

  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/signin?error=missing_code`
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/signin?error=auth_failed`
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/signin?error=session_lost`
    )
  }

  const admin = createServiceClient()
  void handlePostAuthEmails(admin, user)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const destination = resolvePostAuthPath(onboarded, nextParam)
  return NextResponse.redirect(`${requestUrl.origin}${destination}`)
}
