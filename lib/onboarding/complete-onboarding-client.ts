import { createClient } from '@/lib/supabase'
import type { OnboardingInput, SaveOnboardingResult } from '@/lib/onboarding/save-profile'

type ApiSuccess = { ok: true; role: 'student' | 'teacher' }
type ApiFailure = { error: string }

/**
 * Save onboarding via the API route. Sends the browser access token in
 * Authorization because cookie-only auth can fail on client fetch() even when
 * the page render saw a valid session (Supabase refresh race / HttpOnly cookies).
 */
export async function completeOnboardingRequest(
  input: OnboardingInput
): Promise<SaveOnboardingResult> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return {
      ok: false,
      error: 'Not signed in',
      status: 401,
    }
  }

  let res: Response
  try {
    res = await fetch('/api/onboarding', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    })
  } catch (err) {
    console.error('[onboarding client] network error:', err)
    return {
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
      status: 500,
    }
  }

  let data: ApiSuccess | ApiFailure | null = null
  try {
    data = (await res.json()) as ApiSuccess | ApiFailure
  } catch {
    console.error('[onboarding client] non-JSON response:', res.status)
    return {
      ok: false,
      error: 'Unexpected server response. Try again in a moment.',
      status: 500,
    }
  }

  if (res.ok && data && 'ok' in data && data.ok) {
    return {
      ok: true,
      role: data.role === 'teacher' ? 'teacher' : 'student',
    }
  }

  const message =
    data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : 'Could not save your profile. Try again in a moment.'

  return {
    ok: false,
    error: message,
    status: res.status === 401 ? 401 : res.status === 400 ? 400 : 500,
  }
}
