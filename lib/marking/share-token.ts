import { createHmac, timingSafeEqual } from 'crypto'
import { SITE_URL } from '@/lib/site-config'

/** Parent/tutor report links stay open long enough for exam season. */
const TOKEN_TTL_MS = 120 * 24 * 60 * 60 * 1000

export type MarkShareMeta = {
  subjectCode?: string | null
  paperRef?: string | null
}

type TokenPayload = {
  a: string
  e: number
  s?: string
  p?: string
}

function signingSecret(): string {
  const secret =
    process.env.MARK_SHARE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) {
    throw new Error(
      'MARK_SHARE_SECRET, CRON_SECRET, or SUPABASE_SERVICE_ROLE_KEY is required'
    )
  }
  return secret
}

/** Signed token for a public mark report page (`/r/[token]`). */
export function createMarkShareToken(
  attemptId: string,
  meta: MarkShareMeta = {}
): string {
  const payload: TokenPayload = {
    a: attemptId,
    e: Date.now() + TOKEN_TTL_MS,
  }
  if (meta.subjectCode?.trim()) payload.s = meta.subjectCode.trim().slice(0, 32)
  if (meta.paperRef?.trim()) payload.p = meta.paperRef.trim().slice(0, 80)

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', signingSecret())
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyMarkShareToken(
  token: string | null | undefined
): { attemptId: string; subjectCode: string | null; paperRef: string | null } | null {
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
    if (!payload?.a || typeof payload.e !== 'number') return null
    if (Date.now() > payload.e) return null
    return {
      attemptId: payload.a,
      subjectCode: typeof payload.s === 'string' ? payload.s : null,
      paperRef: typeof payload.p === 'string' ? payload.p : null,
    }
  } catch {
    return null
  }
}

export function markShareUrl(token: string): string {
  const base = SITE_URL.replace(/\/$/, '')
  return `${base}/r/${encodeURIComponent(token)}`
}

export function markShareUrlForAttempt(
  attemptId: string,
  meta: MarkShareMeta = {}
): string {
  return markShareUrl(createMarkShareToken(attemptId, meta))
}
