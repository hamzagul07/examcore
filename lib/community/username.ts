export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

const RESERVED = new Set([
  'admin', 'administrator', 'markscheme', 'mark', 'support', 'help', 'mod',
  'moderator', 'root', 'api', 'system', 'staff', 'team', 'official', 'null',
  'undefined', 'me', 'you', 'anonymous', 'anon', 'deleted',
])

export function normalizeUsername(raw: string): string {
  return (raw || '').trim().toLowerCase()
}

export type UsernameCheck =
  | { ok: true; username: string }
  | { ok: false; error: string }

/** Validate a desired username (format + reserved list). Uniqueness is checked in the DB. */
export function validateUsername(raw: string): UsernameCheck {
  const u = normalizeUsername(raw)
  if (!u) return { ok: false, error: 'Pick a username.' }
  if (u.length < 3) return { ok: false, error: 'Use at least 3 characters.' }
  if (u.length > 20) return { ok: false, error: 'Keep it to 20 characters or fewer.' }
  if (!USERNAME_RE.test(u)) {
    return { ok: false, error: 'Use lowercase letters, numbers and underscores only.' }
  }
  if (RESERVED.has(u)) return { ok: false, error: 'That username is reserved — try another.' }
  return { ok: true, username: u }
}
