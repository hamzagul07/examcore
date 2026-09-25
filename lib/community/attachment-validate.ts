/**
 * Pure validation for community attachments — the descriptor a client sends
 * back after `/api/community/upload`, and the bytes it sent up in the first place.
 *
 * Why this exists (code review 2026-09-25, §2 Community): the posts route
 * accepted any `path` string and stored it verbatim, and the post page then
 * signed that path with the service role for every visitor. A tampered client
 * could attach another user's upload — including attachments of a removed or
 * moderated post — to a fresh post and republish it. Every accepted path is
 * now bound to the uploader and to the exact shape `uploadCommunityFile`
 * generates, and kind/ext are recomputed from the mime rather than trusted.
 *
 * No server imports here: the helpers are exercised by attachment-validate.test.ts
 * as a plain tsx script.
 */

export type AttachmentKind = 'image' | 'pdf' | 'doc'

export type CommunityAttachment = {
  path: string
  name: string
  kind: AttachmentKind
  mime: string
  size: number
}

/** Hard ceiling on attachments per post; the composer stops at the same number. */
export const MAX_ATTACHMENTS = 10
/** Display name cap — stored in JSONB on every post row and rendered in lists. */
export const MAX_ATTACHMENT_NAME = 120
/** Vercel serverless body cap; the upload route refuses anything larger. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024

/**
 * Single source of truth for what community uploads may be. The extension is
 * the one `uploadCommunityFile` writes into the object path, so the path
 * pattern below is derived from this table rather than maintained by hand —
 * the two cannot drift apart.
 */
const ATTACHMENT_TYPES: Record<string, { ext: string; kind: AttachmentKind }> = {
  'image/png': { ext: 'png', kind: 'image' },
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/jpg': { ext: 'jpg', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'application/pdf': { ext: 'pdf', kind: 'pdf' },
  'application/msword': { ext: 'doc', kind: 'doc' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    kind: 'doc',
  },
  'application/vnd.ms-powerpoint': { ext: 'ppt', kind: 'doc' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    ext: 'pptx',
    kind: 'doc',
  },
  'application/vnd.ms-excel': { ext: 'xls', kind: 'doc' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: 'xlsx',
    kind: 'doc',
  },
  'text/plain': { ext: 'txt', kind: 'doc' },
  'text/csv': { ext: 'csv', kind: 'doc' },
}

export function attachmentKindForMime(mime: string): AttachmentKind | null {
  return ATTACHMENT_TYPES[(mime || '').toLowerCase()]?.kind ?? null
}

export function extForMime(mime: string): string | null {
  return ATTACHMENT_TYPES[(mime || '').toLowerCase()]?.ext ?? null
}

const ALL_EXTS = [...new Set(Object.values(ATTACHMENT_TYPES).map((t) => t.ext))]
const IMAGE_EXTS = [
  ...new Set(
    Object.values(ATTACHMENT_TYPES)
      .filter((t) => t.kind === 'image')
      .map((t) => t.ext)
  ),
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The exact shape `uploadCommunityFile` produces: `<uploader uuid>/<ms>-<hex>.<ext>`.
 * The random segment is 12 hex chars from `crypto.randomBytes`; `{6,}` keeps
 * paths written by the earlier `Math.random().toString(36)` generator valid.
 */
export function attachmentPathPattern(userId: string, opts: { imagesOnly?: boolean } = {}): RegExp {
  const exts = (opts.imagesOnly ? IMAGE_EXTS : ALL_EXTS).join('|')
  return new RegExp(`^${escapeRegExp(userId)}/[0-9]+-[a-z0-9]{6,}\\.(${exts})$`)
}

/** True when `path` is an object this user uploaded, in the shape we generate. */
export function isOwnedAttachmentPath(
  path: unknown,
  userId: string,
  opts: { imagesOnly?: boolean } = {}
): path is string {
  if (typeof path !== 'string' || !userId) return false
  if (path.length > 200) return false
  return attachmentPathPattern(userId, opts).test(path)
}

/**
 * Display name: control characters and path separators out, capped. A blank
 * or fully-stripped name falls back to the object's basename so the list
 * never renders an empty link.
 */
export function cleanAttachmentName(raw: unknown, path: string): string {
  const cleaned =
    typeof raw === 'string'
      ? raw
          .replace(/[\u0000-\u001f\u007f]/g, '')
          .replace(/[\\/]/g, '-')
          .trim()
          .slice(0, MAX_ATTACHMENT_NAME)
      : ''
  return cleaned || path.slice(path.lastIndexOf('/') + 1)
}

/**
 * Validate one client-supplied descriptor against the uploader. Returns the
 * canonical descriptor (kind/ext recomputed from the mime, name cleaned) or
 * null when anything about it is not ours.
 */
export function normalizeAttachment(raw: unknown, userId: string): CommunityAttachment | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const mime = typeof a.mime === 'string' ? a.mime.toLowerCase() : ''
  const kind = attachmentKindForMime(mime)
  const ext = extForMime(mime)
  if (!kind || !ext) return null
  if (!isOwnedAttachmentPath(a.path, userId)) return null
  // The extension in the path is what the uploader derived from the mime at
  // upload time; a mismatch means the mime was edited after the fact.
  if (!a.path.endsWith(`.${ext}`)) return null
  const size = typeof a.size === 'number' && Number.isFinite(a.size) ? Math.floor(a.size) : NaN
  if (!(size >= 0 && size <= MAX_ATTACHMENT_BYTES)) return null
  return {
    path: a.path,
    name: cleanAttachmentName(a.name, a.path),
    kind,
    mime,
    size,
  }
}

export type NormalizedAttachments =
  | { ok: true; attachments: CommunityAttachment[] }
  | { ok: false; error: string }

/**
 * Validate the whole list. One bad entry fails the request rather than being
 * dropped silently: a genuine client never produces one, and a tampered one
 * should not learn which of its guesses were quietly accepted.
 */
export function normalizeAttachments(
  raw: unknown,
  userId: string,
  max = MAX_ATTACHMENTS
): NormalizedAttachments {
  if (raw == null) return { ok: true, attachments: [] }
  if (!Array.isArray(raw)) return { ok: false, error: 'Attachments must be a list.' }
  if (raw.length > max) {
    return { ok: false, error: `Too many attachments — the limit is ${max}.` }
  }
  const out: CommunityAttachment[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const a = normalizeAttachment(item, userId)
    if (!a) return { ok: false, error: 'One of the attachments is not a file you uploaded.' }
    if (seen.has(a.path)) continue
    seen.add(a.path)
    out.push(a)
  }
  return { ok: true, attachments: out }
}

/** Note images are bare paths; same ownership rule, images only. */
export function normalizeImagePaths(
  raw: unknown,
  userId: string,
  max: number
): { ok: true; paths: string[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, paths: [] }
  if (!Array.isArray(raw)) return { ok: false, error: 'Images must be a list.' }
  if (raw.length > max) return { ok: false, error: `Too many images — the limit is ${max}.` }
  const out: string[] = []
  for (const p of raw) {
    if (!isOwnedAttachmentPath(p, userId, { imagesOnly: true })) {
      return { ok: false, error: 'One of the images is not a file you uploaded.' }
    }
    if (!out.includes(p)) out.push(p)
  }
  return { ok: true, paths: out }
}

// ---------------------------------------------------------------------------
// Content sniffing
// ---------------------------------------------------------------------------

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) if (bytes[offset + i] !== sig[i]) return false
  return true
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
const ZIP = [0x50, 0x4b, 0x03, 0x04] // docx/pptx/xlsx are OOXML zip packages
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] // legacy doc/ppt/xls

const BINARY_SIGNATURES = [PNG, JPEG, GIF87, GIF89, RIFF, PDF, ZIP, OLE]

/** How much of a text upload is inspected for binary content. */
const TEXT_SNIFF_BYTES = 8 * 1024

/**
 * Does the content actually look like the declared mime? The browser's
 * `file.type` is whatever the client says it is; without this a renamed
 * executable or an HTML file is stored under an innocent content type and
 * served from a signed URL as if it were a picture.
 *
 * Text types have no signature, so they pass when they contain no NUL byte
 * and do not open with a known binary header — that is what "plain text"
 * means for our purposes, and it is enough to keep binaries out of `.txt`.
 */
export function sniffMatchesMime(bytes: Uint8Array, mime: string): boolean {
  switch ((mime || '').toLowerCase()) {
    case 'image/png':
      return startsWith(bytes, PNG)
    case 'image/jpeg':
    case 'image/jpg':
      return startsWith(bytes, JPEG)
    case 'image/gif':
      return startsWith(bytes, GIF87) || startsWith(bytes, GIF89)
    case 'image/webp':
      return startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)
    case 'application/pdf':
      return startsWith(bytes, PDF)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return startsWith(bytes, ZIP)
    case 'application/msword':
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.ms-excel':
      return startsWith(bytes, OLE)
    case 'text/plain':
    case 'text/csv': {
      if (BINARY_SIGNATURES.some((sig) => startsWith(bytes, sig))) return false
      const end = Math.min(bytes.length, TEXT_SNIFF_BYTES)
      for (let i = 0; i < end; i++) if (bytes[i] === 0) return false
      return true
    }
    default:
      return false
  }
}
