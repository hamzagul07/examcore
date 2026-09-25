import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { resolvePostAuthPath, resolveSameOriginPath } from '@/lib/auth-redirect'
import { isOnboardingComplete } from '@/lib/onboarding'
import { loadAccessState } from '@/lib/billing/access'

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
  // The sign-in page `router.push`es this string verbatim, so it is a redirect
  // sink even though no redirect happens here: confirm with the URL parser
  // that it stays on this origin before handing it out (review §1.1).
  const destination =
    resolveSameOriginPath(
      resolvePostAuthPath(onboarded, nextParam, role),
      request.nextUrl.origin
    ) ?? resolvePostAuthPath(onboarded, null, role)

  const metadata = user.user_metadata as { full_name?: string; name?: string } | undefined
  const displayName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    undefined

  // Resolved the way the marking gate resolves it — subscription, verified
  // teacher seat and comp together — rather than from {tier, status} alone,
  // which is how a seat-holder came to see a different product in the header
  // than at the gate (review §2, seat-aware feature gates). The same read
  // answers whether the seat is granted, so `teacherVerified` costs nothing.
  const { access, teacherVerified } = await loadAccessState(user.id)

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
      // The granted seat (`teacher_verified_at`), not the self-declared role:
      // what decides the teacher allowance and the class bonus. Display only —
      // every gate re-reads it on the server.
      teacherVerified,
      // Max Resource Vault nav — same probe, no extra round-trip.
      isMax: access === 'max',
      destination,
    },
    pendingCookies
  )
}
