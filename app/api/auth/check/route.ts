import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { resolvePostAuthPath } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'

export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies(
      { user: null, onboarded: false, destination: '/auth/signin' },
      pendingCookies
    )
  }

  const nextParam = request.nextUrl.searchParams.get('next')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const destination = resolvePostAuthPath(onboarded, nextParam)

  return jsonWithAuthCookies(
    {
      user: { id: user.id },
      onboarded,
      destination,
    },
    pendingCookies
  )
}
