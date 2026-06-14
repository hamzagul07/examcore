import { NextRequest } from 'next/server'
import { readPostAuthNextParam } from '@/lib/auth-redirect'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import {
  authenticateRouteRequest,
  redirectWithAuthCookies,
} from '@/lib/supabase-server'

/** Start Google OAuth from the server so PKCE + cookies stay in sync with the callback. */
export async function GET(request: NextRequest) {
  const nextParam = readPostAuthNextParam(
    request.nextUrl.searchParams.get('next'),
    request.nextUrl.searchParams.get('redirect')
  )

  const { supabase, pendingCookies } = await authenticateRouteRequest(request)
  const redirectTo = buildAuthCallbackUrl(request.nextUrl.origin, nextParam)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    console.error('[auth/google] signInWithOAuth failed:', error)
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('error', 'auth_failed')
    if (nextParam) {
      signInUrl.searchParams.set('next', nextParam)
    }
    return redirectWithAuthCookies(signInUrl, pendingCookies)
  }

  return redirectWithAuthCookies(data.url, pendingCookies)
}
