import type { OnboardingInput, SaveOnboardingResult } from '@/lib/onboarding/save-profile'
import { createClient } from '@/lib/supabase'

/**
 * Save the onboarding profile through `POST /api/onboarding` on the cookie
 * session.
 *
 * There used to be two layers here: a server action carrying a signed page
 * token, with this fetch (also carrying the token) as fallback. The token was
 * introduced because server-action POSTs sometimes arrived without the auth
 * cookies ("session expired" on the last step). It also worked as a 4-hour
 * login credential for whoever saw it (review §1.2), so it is gone.
 *
 * What replaces it is the thing the token was papering over: the cookie
 * session is REFRESHED client-side before the save, so a token that expired
 * while the student was filling in five steps is renewed before the POST
 * rather than discovered by it; and a 401 that still gets through is retried
 * exactly once after a second refresh. Only then is "sign in again" shown —
 * with the answers still in the local draft. The API returns refreshed auth
 * cookies on every reply and the wizard then does a full navigation through
 * /onboarding/complete, which writes them back.
 */
export async function completeOnboardingRequest(
  input: OnboardingInput
): Promise<SaveOnboardingResult> {
  try {
    await refreshSessionQuietly()
    let res = await postOnboarding(input)
    if (res.status === 401) {
      // The refresh above can race a rotation already in flight, or the
      // refresh token itself may have been rejected. One more refresh, one
      // more try, then the message — never a silent dead end on step five.
      const refreshed = await refreshSessionQuietly()
      if (refreshed) res = await postOnboarding(input)
    }

    const data = (await res.json().catch(() => ({}))) as
      | { ok: true; role: 'student' | 'teacher' }
      | { error?: string }

    if (res.ok && 'ok' in data && data.ok) {
      return {
        ok: true,
        role: data.role === 'teacher' ? 'teacher' : 'student',
      }
    }

    if (res.status === 401) {
      return {
        ok: false,
        error: 'Your session has expired. Sign in again — your answers are saved on this device.',
        status: 401,
      }
    }

    return {
      ok: false,
      error:
        'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Could not save your profile. Try again in a moment.',
      status: res.status === 400 ? 400 : 500,
    }
  } catch (err) {
    console.error('[onboarding client] save request failed:', err)
    return {
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
      status: 500,
    }
  }
}

function postOnboarding(input: OnboardingInput): Promise<Response> {
  return fetch('/api/onboarding', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/**
 * Renew the browser session's tokens (and the cookies the API reads) without
 * ever failing the save over it. Returns whether a session came back: a
 * refresh that yields nothing means the user really is signed out, and a
 * retry of the POST would only 401 again.
 */
async function refreshSessionQuietly(): Promise<boolean> {
  try {
    const { data, error } = await createClient().auth.refreshSession()
    return !error && !!data.session
  } catch {
    return false
  }
}
