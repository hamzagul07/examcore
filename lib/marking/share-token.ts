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
  /**
   * Token kind. Absent on mark tokens, including every one already in the wild.
   *
   * Both link types are `{payload}.{hmac}` over the same secret, so without a
   * discriminator each verifier would happily accept the other's token and read
   * its subject id out of the same field — a progress link would be looked up
   * as an attempt id, and a mark link as a user id. Neither resolves in
   * practice, but "it happens not to collide" is not an access rule.
   */
  k?: 'progress'
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
    if (payload.k) return null // a progress link is not a mark link
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

// ---------------------------------------------------------------------------
// Progress share links — the page a student sends to a parent
// ---------------------------------------------------------------------------
//
// Same signature scheme and the same exam-season TTL as a mark link, over a
// user id rather than an attempt id. See lib/reports/parent-report.ts for what
// the page is allowed to say: counts, subjects, target and topic names, and
// nothing the student wrote.
//
// The link is a bearer credential with no revocation, which is a deliberate
// trade for a page that carries no name, no email and no answer text — the
// same trade `/r/` already makes, and the reason the report is built the way it
// is. It stops working on its own after TOKEN_TTL_MS.

/** Signed token for a public progress report page (`/p/[token]`). */
export function createProgressShareToken(userId: string): string {
  const payload: TokenPayload = {
    a: userId,
    e: Date.now() + TOKEN_TTL_MS,
    k: 'progress',
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', signingSecret())
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyProgressShareToken(
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
    if (!payload?.a || typeof payload.e !== 'number') return null
    if (payload.k !== 'progress') return null
    if (Date.now() > payload.e) return null
    return { userId: payload.a }
  } catch {
    return null
  }
}

export function progressShareUrl(token: string): string {
  const base = SITE_URL.replace(/\/$/, '')
  return `${base}/p/${encodeURIComponent(token)}`
}

export function progressShareUrlForUser(userId: string): string {
  return progressShareUrl(createProgressShareToken(userId))
}
