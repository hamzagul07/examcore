/**
 * The idempotency key a mark upload carries.
 *
 * `/api/mark/process` accepts `client_request_id` (8–64 url-safe characters)
 * and, when a second upload arrives with the same key from the same caller,
 * answers `{ duplicate: true, mark_run_id }` instead of starting — and
 * charging — a second run. The page never sent one (code review 2026-09-25,
 * §1.8): a connection drop mid-stream showed "tap Mark again", the server
 * kept marking, and the retry was a second charged run.
 *
 * A UUID is 36 characters of `[0-9a-f-]`, inside the server's bound. Kept
 * pure and separate from the page so the shape can be checked without a DOM.
 */

/** Mirrors the server's acceptance pattern exactly. A key that fails it is
 * silently ignored server-side, which would quietly disable the dedupe. */
export const CLIENT_REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

export function isValidClientRequestId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_REQUEST_ID_RE.test(value)
}

/**
 * A fresh key. `crypto.randomUUID` needs a secure context, which every
 * production page is — but a plain-http LAN preview is not, so fall back to
 * `getRandomValues` rather than throwing on the one line that runs before the
 * upload starts.
 */
export function newClientRequestId(
  cryptoImpl: Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string } = globalThis.crypto
): string {
  if (typeof cryptoImpl?.randomUUID === 'function') {
    try {
      return cryptoImpl.randomUUID()
    } catch {
      /* insecure context — fall through */
    }
  }
  const bytes = new Uint8Array(16)
  cryptoImpl.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
