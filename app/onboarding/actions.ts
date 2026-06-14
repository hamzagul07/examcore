'use server'

import { createClient } from '@/lib/supabase-server'
import {
  saveOnboardingProfile,
  type OnboardingInput,
  type SaveOnboardingResult,
} from '@/lib/onboarding/save-profile'

export async function completeOnboardingAction(
  input: OnboardingInput
): Promise<SaveOnboardingResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (!user || error) {
      return { ok: false, error: 'Not signed in', status: 401 }
    }

    return await saveOnboardingProfile(supabase, user.id, input)
  } catch (err) {
    console.error('[onboarding action] unexpected error:', err)
    return {
      ok: false,
      error: 'Could not save your profile. Try again in a moment.',
      status: 500,
    }
  }
}
