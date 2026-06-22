import 'server-only'

import crypto from 'crypto'
import { SITE_URL } from '@/lib/site-config'

export type UnsubscribeKind = 'replies' | 'digest'

function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    'dev-unsubscribe-not-for-production'
  )
}

/** Signed token for one-click email unsubscribe (valid 1 year). */
export function signUnsubscribeToken(userId: string, kind: UnsubscribeKind): string {
  const exp = String(Date.now() + 365 * 24 * 60 * 60 * 1000)
  const payload = `${userId}.${kind}.${exp}`
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url')
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; kind: UnsubscribeKind } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split('.')
    if (parts.length !== 4) return null
    const [userId, kind, exp, sig] = parts
    if (!userId || (kind !== 'replies' && kind !== 'digest') || !exp || !sig) return null
    if (Date.now() > Number(exp)) return null
    const payload = `${userId}.${kind}.${exp}`
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
    if (sig !== expected) return null
    return { userId, kind }
  } catch {
    return null
  }
}

export function unsubscribeUrl(userId: string, kind: UnsubscribeKind): string {
  const token = signUnsubscribeToken(userId, kind)
  return `${SITE_URL}/community/unsubscribe?token=${encodeURIComponent(token)}`
}
