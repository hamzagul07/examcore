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
    .select('onboarded, onboarding_completed, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const role = profile?.role === 'teacher' ? ('teacher' as const) : ('student' as const)
  const destination = resolvePostAuthPath(onboarded, nextParam, role)

  const metadata = user.user_metadata as { full_name?: string; name?: string } | undefined
  const displayName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    undefined

  return jsonWithAuthCookies(
    {
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: displayName,
      },
      onboarded,
      // Surfaced so the header can offer a teacher the way back to their
      // classrooms; this select already ran, so it costs nothing.
      role,
      destination,
    },
    pendingCookies
  )
}
