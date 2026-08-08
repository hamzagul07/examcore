/**
 * Shareable quiz challenge cards.
 * IDs encode score payload (no DB required for MVP).
 * Format: base64url(JSON) — works in Node and the browser.
 */

export type ChallengePayload = {
  title: string
  score: number
  total: number
  quizHref: string
  percentile?: number
}

function b64urlEncode(raw: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(raw, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }
  const b64 = btoa(unescape(encodeURIComponent(raw)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function b64urlDecode(id: string): string {
  const pad = id.length % 4 === 0 ? '' : '='.repeat(4 - (id.length % 4))
  const b64 = id.replace(/-/g, '+').replace(/_/g, '/') + pad
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8')
  }
  return decodeURIComponent(escape(atob(b64)))
}

export function createChallengeId(payload: ChallengePayload): string {
  return b64urlEncode(JSON.stringify(payload))
}

export function getChallenge(id: string): (ChallengePayload & { id: string }) | null {
  try {
    if (!id || id.length > 800) return null
    const parsed = JSON.parse(b64urlDecode(id)) as Partial<ChallengePayload>
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.score !== 'number' ||
      typeof parsed.total !== 'number' ||
      typeof parsed.quizHref !== 'string' ||
      !parsed.quizHref.startsWith('/')
    ) {
      return null
    }
    if (parsed.total <= 0 || parsed.score < 0 || parsed.score > parsed.total) return null
    return {
      id,
      title: parsed.title.slice(0, 120),
      score: parsed.score,
      total: parsed.total,
      quizHref: parsed.quizHref.slice(0, 300),
      percentile:
        typeof parsed.percentile === 'number' ? parsed.percentile : undefined,
    }
  } catch {
    return null
  }
}
