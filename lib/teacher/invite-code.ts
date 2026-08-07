/**
 * Classroom invite codes.
 *
 * A teacher reads this code aloud to a room, or writes it on a whiteboard, and
 * thirty students type it in at once. That is the entire design constraint, and
 * it rules out two things the original codes did:
 *
 *   1. `md5(random())` hex, which produces strings like `a3f9c2e1` — fine for a
 *      machine, miserable to dictate and easy to mistype.
 *   2. Matching them with a SQL `ILIKE`, where an unsanitised `%` from the URL
 *      is a wildcard rather than a character. `/join/%` matched every classroom.
 *
 * The alphabet omits characters that are confusable when spoken or handwritten:
 * no O/0, no I/1/L. 31 symbols over 6 places is ~887M codes, and the unique
 * index on `classrooms.invite_code` is the backstop for the rest.
 */

export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 6

/** Legacy codes are 8 lowercase hex chars; new ones are 6 from the alphabet above. */
const VALID_CODE_RE = /^[A-Z0-9]{4,12}$/

/**
 * Folds user input into the stored form: trimmed, uppercased, and with the
 * separators people add unprompted (spaces, hyphens) removed. Stored codes are
 * uppercase, so this is the only normalisation either side needs.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().replace(/[\s-]+/g, '').toUpperCase()
}

/**
 * Whether a normalised code is safe to query with.
 *
 * This is the guard that closes the wildcard hole: anything outside the strict
 * charset is rejected before it reaches the database, so `%` and `_` can never
 * reach a pattern match. Callers must use an equality lookup on the normalised
 * value, never ILIKE.
 */
export function isValidInviteCode(code: string): boolean {
  return VALID_CODE_RE.test(code)
}

/** Normalises and validates in one step; null means "do not query with this". */
export function parseInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = normalizeInviteCode(raw)
  return isValidInviteCode(code) ? code : null
}

/**
 * Generates a code. Uses rejection sampling over the alphabet so every symbol is
 * equally likely — `% alphabet.length` on a byte would quietly bias the first
 * few letters, which matters when the unique index is doing collision duty.
 */
export function generateInviteCode(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes
): string {
  const n = INVITE_CODE_ALPHABET.length
  const limit = 256 - (256 % n)
  let out = ''
  while (out.length < INVITE_CODE_LENGTH) {
    const bytes = randomBytes(INVITE_CODE_LENGTH)
    for (const b of bytes) {
      if (b >= limit) continue
      out += INVITE_CODE_ALPHABET[b % n]
      if (out.length === INVITE_CODE_LENGTH) break
    }
  }
  return out
}

function defaultRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

/** Renders a code for display: `ABC-123` reads and dictates better than `ABC123`. */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code)
  if (c.length !== INVITE_CODE_LENGTH) return c
  return `${c.slice(0, 3)}-${c.slice(3)}`
}
