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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not signed in', status: 401 }
  }

  return saveOnboardingProfile(supabase, user.id, input)
}
