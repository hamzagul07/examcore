import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase-server'
import {
  MAX_ATTACHMENT_NAME,
  attachmentKindForMime,
  extForMime,
  type AttachmentKind,
  type CommunityAttachment,
} from '@/lib/community/attachment-validate'

/** Private bucket for community post attachments (PDFs, images, docs). */
export const COMMUNITY_UPLOADS_BUCKET = 'community-uploads'

const DEFAULT_TTL_SEC = 60 * 60

// The mime table and the path validator live in attachment-validate.ts so
// they can be unit-tested without a Supabase client; re-exported here so
// existing imports keep working.
export { attachmentKindForMime }
export type { AttachmentKind, CommunityAttachment }

/**
 * Object path for a new upload: `<uploader>/<ms>-<12 hex>.<ext>`.
 *
 * The uploader's id is the first folder on purpose — it is what the storage
 * SELECT policy scopes on and what `isOwnedAttachmentPath` checks when the
 * descriptor comes back from the client. The random segment comes from
 * `crypto.randomBytes`: the earlier `Math.random().toString(36).slice(2, 8)`
 * could come back shorter than six characters, which the validator's `{6,}`
 * would then reject for a genuine upload.
 */
export function newAttachmentPath(userId: string, mime: string): string | null {
  const ext = extForMime(mime)
  if (!ext) return null
  return `${userId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
}

export async function uploadCommunityFile(input: {
  buffer: Buffer
  mime: string
  originalName: string
  userId: string
}): Promise<CommunityAttachment | null> {
  const mime = input.mime.toLowerCase()
  const kind = attachmentKindForMime(mime)
  const path = newAttachmentPath(input.userId, mime)
  if (!kind || !path) return null
  try {
    const admin = createServiceClient()
    const { error } = await admin.storage
      .from(COMMUNITY_UPLOADS_BUCKET)
      .upload(path, input.buffer, { contentType: mime, upsert: false })
    if (error) {
      console.error('community upload error:', error)
      return null
    }
    return {
      path,
      name: input.originalName.slice(0, MAX_ATTACHMENT_NAME),
      kind,
      mime,
      size: input.buffer.byteLength,
    }
  } catch (err) {
    console.error('uploadCommunityFile error:', err)
    return null
  }
}

export async function signCommunityFileUrl(
  path: string | null | undefined,
  expiresIn = DEFAULT_TTL_SEC
): Promise<string | null> {
  if (!path) return null
  const admin = createServiceClient()
  const { data, error } = await admin.storage
    .from(COMMUNITY_UPLOADS_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export type SignedAttachment = CommunityAttachment & { url: string | null }

export async function signAttachments(
  attachments: CommunityAttachment[] | null | undefined
): Promise<SignedAttachment[]> {
  if (!attachments?.length) return []
  return Promise.all(
    attachments.map(async (a) => ({ ...a, url: await signCommunityFileUrl(a.path) }))
  )
}
