import { completeOnboardingAction } from '@/app/onboarding/actions'
import type { OnboardingInput, SaveOnboardingResult } from '@/lib/onboarding/save-profile'

/**
 * Save onboarding via server action + signed page token (no session cookies on POST).
 * Falls back to API route with the same token if the action fails to run.
 */
export async function completeOnboardingRequest(
  saveToken: string,
  input: OnboardingInput
): Promise<SaveOnboardingResult> {
  try {
    const actionResult = await completeOnboardingAction(saveToken, input)
    if (actionResult.ok || actionResult.status !== 500) {
      return actionResult
    }
  } catch (err) {
    console.error('[onboarding client] server action failed:', err)
  }

  try {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveToken, ...input }),
    })

    const data = (await res.json()) as
      | { ok: true; role: 'student' | 'teacher' }
      | { error: string }

    if (res.ok && 'ok' in data && data.ok) {
      return {
        ok: true,
        role: data.role === 'teacher' ? 'teacher' : 'student',
      }
    }

    return {
      ok: false,
      error:
        'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Could not save your profile. Try again in a moment.',
      status: res.status === 401 ? 401 : res.status === 400 ? 400 : 500,
    }
  } catch (err) {
    console.error('[onboarding client] API fallback failed:', err)
    return {
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
      status: 500,
    }
  }
}
