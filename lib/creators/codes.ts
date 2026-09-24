/**
 * Creator codes and links — the pure half of the Creators program
 * (docs/CREATORS_PROGRAM.md). No I/O here; lib/creators/service.ts does the
 * database work.
 *
 * A creator code is what a 17-year-old says out loud in a TikTok ("use code
 * MAYA"), so it is short, uppercase and has no punctuation. TikTok captions are
 * not clickable, which is why the code matters more than the link.
 */

export const CREATOR_CODE_RE = /^[A-Z0-9]{3,12}$/

/** Cookie that carries a creator ref from a landing to the eventual signup. */
export const CREATOR_REF_COOKIE = 'ms_ref'
/** Thirty days: long enough to cover "saw the video, signed up on the laptop later". */
export const CREATOR_REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
/** Where the mark page remembers a code between visits (per browser). */
export const CREATOR_CODE_STORAGE_KEY = 'ms_creator_code'
/** Query param that carries a code on /mark and on signup links. */
export const CREATOR_CODE_PARAM = 'code'

/** Marked answers a creator's audience needs before the gap report is evidence. */
export const GAP_REPORT_MIN_SCRIPTS = 50

export function normalizeCreatorCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export type CreatorCodeCheck =
  | { ok: true; code: string }
  | { ok: false; reason: 'empty' | 'too_short' | 'invalid' }

export function validateCreatorCode(raw: unknown): CreatorCodeCheck {
  const code = normalizeCreatorCode(raw)
  if (!code) return { ok: false, reason: 'empty' }
  if (code.length < 3) return { ok: false, reason: 'too_short' }
  if (!CREATOR_CODE_RE.test(code)) return { ok: false, reason: 'invalid' }
  return { ok: true, code }
}

/**
 * What the attribution cookie holds. A landing on /with/@handle knows the
 * handle, a ?code= link knows the code; either resolves to the same creator
 * later, and storing which one we saw keeps the proxy free of database reads.
 */
export type CreatorRef = { kind: 'code'; value: string } | { kind: 'handle'; value: string }

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

/** Cookie attributes shared by the proxy and /api/creators/ref. */
export function creatorRefCookieOptions(): {
  maxAge: number
  path: string
  sameSite: 'lax'
  httpOnly: boolean
  secure: boolean
} {
  return {
    maxAge: CREATOR_REF_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }
}

export function serializeCreatorRef(ref: CreatorRef): string {
  return `${ref.kind}:${ref.value}`
}

export function parseCreatorRef(raw: unknown): CreatorRef | null {
  if (typeof raw !== 'string') return null
  const idx = raw.indexOf(':')
  if (idx <= 0) return null
  const kind = raw.slice(0, idx)
  const value = raw.slice(idx + 1)
  if (kind === 'code') {
    const check = validateCreatorCode(value)
    return check.ok ? { kind: 'code', value: check.code } : null
  }
  if (kind === 'handle') {
    const handle = value.trim().toLowerCase()
    return HANDLE_RE.test(handle) ? { kind: 'handle', value: handle } : null
  }
  return null
}

/**
 * The ref a request carries, if any: `/with/<handle>` or `?code=<CODE>` on
 * any path. Used by the proxy to set the cookie without touching the database.
 */
export function creatorRefFromRequest(
  pathname: string,
  searchParams: URLSearchParams
): CreatorRef | null {
  const fromQuery = searchParams.get(CREATOR_CODE_PARAM)
  if (fromQuery) {
    const check = validateCreatorCode(fromQuery)
    if (check.ok) return { kind: 'code', value: check.code }
  }
  const m = /^\/with\/([^/]+)\/?$/.exec(pathname)
  if (m) {
    let raw = m[1]
    try {
      raw = decodeURIComponent(raw)
    } catch {
      return null
    }
    const handle = raw.replace(/^@/, '').trim().toLowerCase()
    if (HANDLE_RE.test(handle)) return { kind: 'handle', value: handle }
  }
  return null
}

export function creatorSpacePath(handle: string): string {
  return `/with/${encodeURIComponent(handle)}`
}

export function creatorMarkPath(code: string): string {
  return `/mark?${CREATOR_CODE_PARAM}=${encodeURIComponent(code)}`
}

export function creatorSignupPath(code: string): string {
  return `/auth/signup?${CREATOR_CODE_PARAM}=${encodeURIComponent(code)}`
}

// --- milestones ---------------------------------------------------------------

export type CreatorMilestone = {
  /** Answers marked via this creator. */
  at: number
  label: string
  detail: string
}

/** Recognition ladder from docs/CREATORS_PROGRAM.md; product, never cash. */
export const CREATOR_MILESTONES: readonly CreatorMilestone[] = [
  {
    at: GAP_REPORT_MIN_SCRIPTS,
    label: 'Gap report',
    detail: 'Where your followers lose marks unlocks.',
  },
  { at: 100, label: 'Top creator', detail: 'Featured on /creators with a bigger gift pool.' },
  {
    at: 500,
    label: 'Certificate',
    detail: 'A signed certificate and a feature on MarkScheme’s own account.',
  },
]

export function reachedMilestones(marked: number): CreatorMilestone[] {
  return CREATOR_MILESTONES.filter((m) => marked >= m.at)
}

export function nextMilestone(
  marked: number
): (CreatorMilestone & { remaining: number; progress: number }) | null {
  const next = CREATOR_MILESTONES.find((m) => marked < m.at)
  if (!next) return null
  const prev = [...CREATOR_MILESTONES].reverse().find((m) => m.at <= marked)?.at ?? 0
  const span = next.at - prev
  return {
    ...next,
    remaining: next.at - marked,
    progress: span > 0 ? Math.min(1, Math.max(0, (marked - prev) / span)) : 0,
  }
}

// --- share kit ------------------------------------------------------------------

export type ShareKit = {
  /** The creator's space. */
  link: string
  /** Straight to marking with the code applied. */
  markLink: string
  /** One line for a TikTok / Instagram bio. */
  bioLine: string
  /** A pinned comment under a video. */
  pinnedComment: string
  /** A caption for a video about getting marked. */
  caption: string
  /** The disclosure every post must carry (ASA/CAP, ASCI): the seat is a gift. */
  disclosure: string
}

/**
 * Copy a creator can paste without editing. The disclosure is part of the
 * text, not a footnote — a free seat makes the post an ad in the UK and India,
 * and the creators this program is for are mostly under 18.
 */
export function buildShareKit(opts: {
  handle: string
  code: string
  giftMarks: number
  siteUrl: string
}): ShareKit {
  const site = opts.siteUrl.replace(/\/+$/, '')
  const host = site.replace(/^https?:\/\//, '')
  const link = `${site}${creatorSpacePath(opts.handle)}`
  const markLink = `${site}${creatorMarkPath(opts.code)}`
  const gift = opts.giftMarks > 0 ? `${opts.giftMarks} free marks` : 'free marking'
  const disclosure = '#ad — I have a free MarkScheme creator seat.'
  return {
    link,
    markLink,
    bioLine: `${gift} on MarkScheme with code ${opts.code} → ${host}/with/${opts.handle}`,
    pinnedComment: `Get your answer marked against the real mark scheme in ~90s, no account needed: ${link} · code ${opts.code} = ${gift} when you sign up. ${disclosure}`,
    caption: `I let an AI examiner mark my answer 😭 Try yours with code ${opts.code} (${gift}) — link in bio. ${disclosure}`,
    disclosure,
  }
}
