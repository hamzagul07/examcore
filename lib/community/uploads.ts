import { createServiceClient } from '@/lib/supabase-server'

/** Private bucket for community post attachments (PDFs, images, docs). */
export const COMMUNITY_UPLOADS_BUCKET = 'community-uploads'

const DEFAULT_TTL_SEC = 60 * 60

export type AttachmentKind = 'image' | 'pdf' | 'doc'

export type CommunityAttachment = {
  path: string
  name: string
  kind: AttachmentKind
  mime: string
  size: number
}

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const DOC_MIME = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

export function attachmentKindForMime(mime: string): AttachmentKind | null {
  const m = mime.toLowerCase()
  if (IMAGE_MIME.has(m)) return 'image'
  if (m === 'application/pdf') return 'pdf'
  if (DOC_MIME.has(m)) return 'doc'
  return null
}

function extForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
  }
  return map[mime.toLowerCase()] ?? 'bin'
}

export async function uploadCommunityFile(input: {
  buffer: Buffer
  mime: string
  originalName: string
  userId: string
}): Promise<CommunityAttachment | null> {
  const kind = attachmentKindForMime(input.mime)
  if (!kind) return null
  try {
    const admin = createServiceClient()
    const ext = extForMime(input.mime)
    const path = `${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await admin.storage
      .from(COMMUNITY_UPLOADS_BUCKET)
      .upload(path, input.buffer, { contentType: input.mime, upsert: false })
    if (error) {
      console.error('community upload error:', error)
      return null
    }
    return {
      path,
      name: input.originalName.slice(0, 120),
      kind,
      mime: input.mime,
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
