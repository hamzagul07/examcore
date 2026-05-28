import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Lands here after a magic-link click, password-signup confirmation, or
 * password reset. Exchanges the auth code for a session, then routes:
 *   - to `?next=` if provided (e.g. /auth/reset-password for recovery flow),
 *   - to /onboarding for new users who haven't completed onboarding yet,
 *   - to /dashboard otherwise.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

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

  // Explicit `next` (e.g. password recovery) always wins.
  if (next) {
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Shouldn't happen post-exchange, but fall back to signin defensively.
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/signin?error=session_lost`
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = profile?.onboarded === true
  return NextResponse.redirect(
    `${requestUrl.origin}${onboarded ? '/dashboard' : '/onboarding'}`
  )
}
