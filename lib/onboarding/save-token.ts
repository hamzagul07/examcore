import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours — plenty for onboarding

type TokenPayload = {
  userId: string
  exp: number
}

function signingSecret(): string {
  const secret =
    process.env.ONBOARDING_SAVE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) {
    throw new Error('ONBOARDING_SAVE_SECRET or SUPABASE_SERVICE_ROLE_KEY is required')
  }
  return secret
}

/** Issued on the onboarding page after the server confirms the user is signed in. */
export function createOnboardingSaveToken(userId: string): string {
  const payload: TokenPayload = {
    userId,
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', signingSecret())
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyOnboardingSaveToken(
  token: string | null | undefined
): { userId: string } | null {
  if (!token || typeof token !== 'string') return null

  const dot = token.indexOf('.')
  if (dot <= 0) return null

  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  try {
    const expected = createHmac('sha256', signingSecret())
      .update(payloadB64)
      .digest('base64url')

    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as TokenPayload

    if (
      !payload.userId ||
      typeof payload.exp !== 'number' ||
      Date.now() > payload.exp
    ) {
      return null
    }

    return { userId: payload.userId }
  } catch {
    return null
  }
}
