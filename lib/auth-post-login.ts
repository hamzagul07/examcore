import { resolvePostAuthPath } from '@/lib/auth-redirect'
import { writeMarkBoardHint } from '@/lib/marking/mark-board-hint'
import { lockableProfileBoard } from '@/lib/marking/mark-board-lock'

type PostAuthCheckResponse = {
  user: { id: string } | null
  onboarded?: boolean
  destination?: string
  role?: string
  board?: string | null
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
    // Cache the board /mark will lock to (students only) before the first
    // visit on this device, so the grid never paints and then collapses.
    if (data.user) writeMarkBoardHint(lockableProfileBoard(data.board, data.role))
    if (data.destination) return data.destination
    if (data.user) {
      return resolvePostAuthPath(data.onboarded === true, nextPath)
    }
  } catch {
    // Network blip — fall back to client-side routing rules.
  }

  return resolvePostAuthPath(false, nextPath)
}
