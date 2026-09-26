import { resolvePostAuthPath, resolveSameOriginPath } from '@/lib/auth-redirect'

type PostAuthCheckResponse = {
  user: { id: string } | null
  onboarded?: boolean
  destination?: string
}

/**
 * After client-side sign-in (password or OTP), ask the server where to send
 * the user — respects onboarding and `next` params.
 */
export async function fetchPostAuthDestination(
  nextPath?: string | null
): Promise<string> {
  const params = new URLSearchParams()
  if (nextPath) params.set('next', nextPath)

  try {
    const res = await fetch(
      `/api/auth/check${params.size ? `?${params.toString()}` : ''}`,
      { credentials: 'same-origin' }
    )
    if (!res.ok) {
      return resolvePostAuthPath(false, nextPath)
    }

    const data = (await res.json()) as PostAuthCheckResponse
    // Defence in depth: the server already sanitises `destination`, but the
    // page pushes whatever comes back into router.push / location.href, and a
    // backslash there once turned into an off-site redirect (review §1.1).
    // Anything that would leave this origin falls back to the client rules.
    if (data.destination) {
      return (
        resolveSameOriginPath(data.destination, window.location.origin) ??
        resolvePostAuthPath(data.onboarded === true, nextPath)
      )
    }
    if (data.user) {
      return resolvePostAuthPath(data.onboarded === true, nextPath)
    }
  } catch {
    // Network blip — fall back to client-side routing rules.
  }

  return resolvePostAuthPath(false, nextPath)
}
