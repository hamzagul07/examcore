import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Standard-webhooks signature verification, for Resend delivery events.
 *
 * Resend signs with the same scheme Polar does, but the Polar SDK's validator is
 * bound to Polar's own event union, so the twenty lines are written out rather
 * than borrowed. The scheme: sign `{id}.{timestamp}.{body}` with the base64
 * secret that follows the `whsec_` prefix, and send it as `v1,<base64>` in
 * `svix-signature` — which may carry several space-separated versions, so any
 * one matching is a pass.
 *
 * Pure and dependency-free, so the parsing and the timing-safe compare are
 * testable without a network or a live secret.
 */

/** Reject anything older than this, so a captured request cannot be replayed. */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

export type ResendEventName =
  | 'email.sent'
  | 'email.delivered'
  | 'email.bounced'
  | 'email.complained'
  | 'email.delivery_delayed'
  | 'email.opened'
  | 'email.clicked'

export type VerifyInput = {
  body: string
  id: string | null
  timestamp: string | null
  signature: string | null
  secret: string
  /** Injected so the tolerance window is testable. */
  nowSeconds?: number
}

export function verifyResendSignature(input: VerifyInput): boolean {
  const { body, id, timestamp, signature, secret } = input
  if (!id || !timestamp || !signature || !secret) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > WEBHOOK_TOLERANCE_SECONDS) return false

  // `whsec_` is a display prefix; the key material is the base64 that follows.
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    return false
  }
  if (key.length === 0) return false

  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')

  // The header carries one or more space-separated `v1,<sig>` pairs; a rotated
  // secret means two are present and either is valid.
  for (const part of signature.split(' ')) {
    const [version, candidate] = part.split(',')
    if (version !== 'v1' || !candidate) continue
    const a = Buffer.from(candidate)
    const b = Buffer.from(expected)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

export type SuppressionUpdate = {
  email: string
  reason: 'bounced' | 'complained'
  detail: string | null
}

/**
 * What, if anything, a Resend event means for future sends.
 *
 * Only two events stop us mailing someone. A complaint is absolute — they
 * pressed "spam" and mailing them again is how a sending domain dies. A bounce
 * is only permanent when it is hard: a full mailbox or a greylisting server is
 * a transient failure, and suppressing on those would quietly delete live
 * students from every future audience.
 */
export function suppressionFromEvent(
  type: string,
  data: Record<string, unknown> | null | undefined
): SuppressionUpdate | null {
  const to = Array.isArray(data?.to) ? data?.to[0] : data?.to
  const email = typeof to === 'string' ? to.trim().toLowerCase() : ''
  if (!email) return null

  if (type === 'email.complained') {
    return { email, reason: 'complained', detail: null }
  }

  if (type === 'email.bounced') {
    const bounce = (data?.bounce ?? {}) as Record<string, unknown>
    const kind = String(bounce.type ?? '').toLowerCase()
    // Resend reports Hard / Soft / Undetermined. Only Hard is forever.
    if (kind !== 'hard') return null
    const detail =
      typeof bounce.message === 'string' ? bounce.message.slice(0, 300) : null
    return { email, reason: 'bounced', detail }
  }

  return null
}
