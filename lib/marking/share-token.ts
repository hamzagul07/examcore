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

/**
 * The HMAC key behind every NEW /r and /p link.
 *
 * In production this is MARK_SHARE_SECRET and nothing else. The fallbacks to
 * CRON_SECRET and the service-role key (code review 2026-09-25, §3) meant a
 * bearer credential for the whole database doubled as the signing key for
 * public URLs — and that quietly rotating either of them would invalidate every
 * report link a parent had been sent. Thrown at first use, not at import, so a
 * misconfigured deploy still boots and fails only the share paths, loudly.
 * Outside production the fallbacks stay so a preview or a local run needs no
 * extra secret.
 */
function signingSecret(): string {
  const explicit = process.env.MARK_SHARE_SECRET?.trim()
  if (explicit) return explicit
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MARK_SHARE_SECRET is required in production: mark and progress share links are signed with it. Set it to a long random string (openssl rand -base64 32); do not reuse CRON_SECRET or the service-role key.'
    )
  }
  const fallback =
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!fallback) {
    throw new Error(
      'MARK_SHARE_SECRET is required (outside production CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY is accepted as a fallback)'
    )
  }
  return fallback
}

/**
 * Keys a link may have been signed with, newest first — for VERIFICATION only.
 *
 * Every /r and /p link mailed to a parent before MARK_SHARE_SECRET existed
 * was signed with CRON_SECRET or the service-role key. Requiring the new
 * secret for signing is right; requiring it for verification would have
 * turned all of those into "this link is invalid" the moment the variable
 * was set — a regression for exactly the people the links were sent to.
 * So the legacy keys stay accepted, verify-only, until every link signed
 * with them has expired on its own: TOKEN_TTL_MS after the deploy that
 * introduced MARK_SHARE_SECRET (2026-09-25), i.e. remove the two legacy
 * entries after 2027-01-23. Nothing is ever SIGNED with them in production.
 *
 * Empty when no key is configured at all: the caller treats that as "cannot
 * verify" and renders the invalid-link state rather than a 500 (see
 * verifyWithAnyKey), and logs it once so the deploy fault is not silent.
 */
function verificationSecrets(): string[] {
  const candidates = [
    process.env.MARK_SHARE_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  ]
  const unique: string[] = []
  for (const c of candidates) {
    if (c && !unique.includes(c)) unique.push(c)
  }
  return unique
}

let warnedNoVerificationSecret = false

/**
 * Constant-time check of `sig` over `payloadB64` against each accepted key.
 * A missing key set is a deployment fault, reported once, and reads as
 * "not verified": the two public pages then render their invalid-link state
 * instead of throwing a 500 from inside a server component.
 */
function verifyWithAnyKey(payloadB64: string, sig: string): boolean {
  const keys = verificationSecrets()
  if (keys.length === 0) {
    if (!warnedNoVerificationSecret) {
      warnedNoVerificationSecret = true
      console.error(
        '[share-token] no signing secret configured (MARK_SHARE_SECRET); every share link reads as invalid until it is set'
      )
    }
    return false
  }
  const sigBuf = Buffer.from(sig)
  for (const key of keys) {
    const expectedBuf = Buffer.from(
      createHmac('sha256', key).update(payloadB64).digest('base64url')
    )
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true
    }
  }
  return false
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
    // Inside the try, and never throwing on a missing secret: this runs in
    // the /r page's render, where a throw is a 500 for the parent holding
    // the link. The fault is logged once by verifyWithAnyKey instead.
    if (!verifyWithAnyKey(payloadB64, sig)) return null

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
    // Same as verifyMarkShareToken: legacy keys accepted for verification,
    // a missing key reads as "not verified" rather than a 500 on /p.
    if (!verifyWithAnyKey(payloadB64, sig)) return null

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
