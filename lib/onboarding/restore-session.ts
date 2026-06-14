import type { NextRequest } from 'next/server'
import {
  createClientFromRequest,
  createServiceClient,
  type SupabaseAuthCookie,
} from '@/lib/supabase-server'
import { isOnboardingComplete } from '@/lib/onboarding'

export type RestoreSessionFailure =
  | 'no_email'
  | 'link_failed'
  | 'verify_failed'

/** Service-role check — used when the user JWT may not reach PostgREST. */
export async function isProfileOnboardedForUser(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  return isOnboardingComplete(profile)
}

/**
 * Re-establish a Supabase session server-side after onboarding save when auth
 * cookies are missing (common after Google OAuth + token-based profile save).
 */
export async function restoreSessionForUserId(
  request: NextRequest,
  userId: string,
  redirectTo: string
): Promise<
  | { ok: true; pendingCookies: SupabaseAuthCookie[] }
  | { ok: false; reason: RestoreSessionFailure }
> {
  const service = createServiceClient()
  const { data: authData, error: userError } =
    await service.auth.admin.getUserById(userId)

  const email = authData?.user?.email
  if (userError || !email) {
    console.error('[restore-session] getUserById failed:', userError)
    return { ok: false, reason: 'no_email' }
  }

  const { data: linkData, error: linkError } =
    await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

  const hashedToken = linkData?.properties?.hashed_token
  if (linkError || !hashedToken) {
    console.error('[restore-session] generateLink failed:', linkError)
    return { ok: false, reason: 'link_failed' }
  }

  const pendingCookies: SupabaseAuthCookie[] = []
  const supabase = createClientFromRequest(request, (cookiesToSet) => {
    pendingCookies.push(...cookiesToSet)
  })

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: hashedToken,
  })

  if (verifyError) {
    console.error('[restore-session] verifyOtp failed:', verifyError)
    return { ok: false, reason: 'verify_failed' }
  }

  return { ok: true, pendingCookies }
}
