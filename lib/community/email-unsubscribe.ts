import 'server-only'

import crypto from 'crypto'
import { SITE_URL } from '@/lib/site-config'

export type UnsubscribeKind = 'replies' | 'digest' | 'threads' | 'review' | 'weekly' | 'streak'

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
    if (
      !userId ||
      (kind !== 'replies' &&
        kind !== 'digest' &&
        kind !== 'threads' &&
        kind !== 'review' &&
        kind !== 'weekly' &&
        kind !== 'streak') ||
      !exp ||
      !sig
    )
      return null
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

/**
 * RFC 8058 one-click endpoint. Mailbox providers POST here; the human-facing
 * page at /community/unsubscribe only answers GET, so it cannot serve both.
 */
export const ONE_CLICK_UNSUBSCRIBE_PATH = '/api/email/unsubscribe'

export function oneClickUnsubscribeUrl(userId: string, kind: UnsubscribeKind): string {
  const token = signUnsubscribeToken(userId, kind)
  return `${SITE_URL}${ONE_CLICK_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`
}

/**
 * Rewrites a body unsubscribe link into its one-click twin, so a sender that
 * already computed the page URL does not have to thread userId + kind through
 * as well. Returns null if the href is not one of ours.
 */
export function oneClickUrlFromPageHref(href: string): string | null {
  try {
    const token = new URL(href).searchParams.get('token')
    if (!token) return null
    return `${SITE_URL}${ONE_CLICK_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`
  } catch {
    return null
  }
}

/** The profile column each kind switches off. Shared so the one-click endpoint
 * and the preferences page cannot disagree about what "unsubscribe" means. */
export function unsubscribeColumnPatch(kind: UnsubscribeKind): Record<string, boolean> {
  switch (kind) {
    case 'replies':
      return { email_community_replies: false }
    case 'threads':
      return { email_community_threads: false }
    case 'review':
      return { email_review_digest: false }
    case 'weekly':
      return { email_weekly_report: false }
    case 'streak':
      return { email_streak_reminders: false }
    default:
      return { email_community_digest: false }
  }
}

export function unsubscribeLabel(kind: UnsubscribeKind): string {
  switch (kind) {
    case 'replies':
      return 'Exam Room reply emails'
    case 'threads':
      return 'Exam Room thread activity emails'
    case 'review':
      return 'review reminder emails'
    case 'weekly':
      return 'weekly progress report emails'
    case 'streak':
      return 'streak reminder emails'
    default:
      return 'Exam Room weekly digest'
  }
}
