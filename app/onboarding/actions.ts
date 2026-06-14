'use server'

import { createServiceClient } from '@/lib/supabase/service'
import {
  saveOnboardingProfile,
  type OnboardingInput,
  type SaveOnboardingResult,
} from '@/lib/onboarding/save-profile'
import { verifyOnboardingSaveToken } from '@/lib/onboarding/save-token'

/**
 * Save onboarding using a signed token from the page render — does not rely on
 * auth cookies being present on the server-action POST (the root cause of the
 * recurring "session expired" errors on step 5).
 */
export async function completeOnboardingAction(
  saveToken: string,
  input: OnboardingInput
): Promise<SaveOnboardingResult> {
  const verified = verifyOnboardingSaveToken(saveToken)
  if (!verified) {
    return {
      ok: false,
      error: 'This page expired. Refresh and try saving again.',
      status: 401,
    }
  }

  try {
    const service = createServiceClient()
    return await saveOnboardingProfile(service, verified.userId, input)
  } catch (err) {
    console.error('[onboarding action] unexpected error:', err)
    return {
      ok: false,
      error: 'Could not save your profile. Try again in a moment.',
      status: 500,
    }
  }
}
