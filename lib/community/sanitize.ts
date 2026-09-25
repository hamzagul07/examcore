/**
 * Safety helpers for rendering UNTRUSTED user-contributed markdown.
 *
 * Defence model (why this is safe without DOMPurify):
 *  - We render with react-markdown and do NOT enable `rehype-raw`, so any raw
 *    HTML in the input is treated as literal text, never parsed into nodes.
 *  - KaTeX runs with `trust:false` (default), so `\href`/`\url` are disabled.
 *  - The only remaining XSS vector is a dangerous URL protocol in a markdown
 *    link/image (`javascript:`, `data:`, `vbscript:`). `safeUrl()` closes that.
 *  - `stripRawHtml()` is belt-and-braces on the stored value.
 */

const SAFE_PROTOCOL = /^(https?:|mailto:)/i

/** Returns the URL only if it uses a safe protocol (or is relative); else undefined. */
export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  // Relative/in-page links are safe.
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./')) {
    return trimmed
  }
  // Reject anything with a colon that isn't an allow-listed protocol
  // (blocks javascript:, data:, vbscript:, file:, etc.).
  if (trimmed.includes(':') && !SAFE_PROTOCOL.test(trimmed)) return undefined
  if (SAFE_PROTOCOL.test(trimmed)) return trimmed
  // No protocol, no leading slash — treat as relative-safe (e.g. "page").
  return trimmed
}

const DANGEROUS_SCHEME = /(?:javascript|vbscript)\s*:/gi
const DATA_HTML = /\bdata:\s*text\/html/gi

/**
 * Belt-and-braces: strip obvious raw-HTML injection markers from stored markdown.
 *
 * The scheme strip loops until nothing changes: a single pass turns
 * `javajavascript:script:` into `javascript:` (code review 2026-09-25, §3).
 * This is still not the gate — `safeUrl()` is, at render time — it only keeps
 * the stored value from carrying an obviously hostile string.
 */
export function stripRawHtml(md: string): string {
  if (!md) return ''
  let out = md
    .replace(/<\s*\/?\s*(script|iframe|style|object|embed|link|meta|base|form|svg)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=/gi, ' data-x=')
  let prev: string
  do {
    prev = out
    out = out.replace(DANGEROUS_SCHEME, '').replace(DATA_HTML, '')
  } while (out !== prev)
  return out
}

/** Trim + cap stored markdown to a sane length (defence against payload bloat). */
export function clampNoteContent(md: string, max = 20000): string {
  return (md || '').slice(0, max)
}
