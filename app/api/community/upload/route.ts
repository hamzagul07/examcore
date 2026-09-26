import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { uploadCommunityFile } from '@/lib/community/uploads'
import {
  MAX_ATTACHMENT_BYTES,
  attachmentKindForMime,
  cleanAttachmentName,
  sniffMatchesMime,
} from '@/lib/community/attachment-validate'
import { ensureUsername } from '@/lib/community/ensure-username'

export const maxDuration = 60

/** POST /api/community/upload (multipart) — upload one attachment, return its descriptor. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to upload.' }, pendingCookies, { status: 401 })

  const { username } = await ensureUsername(user.id)
  if (!username) {
    return jsonWithAuthCookies(
      { error: 'Could not set up your public name — try again.' },
      pendingCookies,
      { status: 500 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid upload.' }, pendingCookies, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return jsonWithAuthCookies({ error: 'No file received.' }, pendingCookies, { status: 400 })
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return jsonWithAuthCookies(
      { error: 'File too large — keep attachments under 4 MB.' },
      pendingCookies,
      { status: 413 }
    )
  }
  const mime = (file.type || '').toLowerCase()
  if (!attachmentKindForMime(mime)) {
    return jsonWithAuthCookies(
      { error: 'Unsupported file type. Use PDF, images, or office documents.' },
      pendingCookies,
      { status: 415 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // `file.type` is whatever the browser (or a hand-rolled request) claims.
  // The object is stored under that content type and served from a signed
  // URL, so the bytes have to agree with it — an HTML file renamed .png must
  // not end up served as an image (code review 2026-09-25, §2 Community).
  if (!sniffMatchesMime(buffer, mime)) {
    return jsonWithAuthCookies(
      { error: 'That file does not look like its declared type. Re-export it and try again.' },
      pendingCookies,
      { status: 415 }
    )
  }

  const attachment = await uploadCommunityFile({
    buffer,
    mime,
    originalName: cleanAttachmentName(file.name, 'attachment'),
    userId: user.id,
  })
  if (!attachment) {
    return jsonWithAuthCookies({ error: 'Upload failed. Try again.' }, pendingCookies, { status: 500 })
  }
  return jsonWithAuthCookies({ ok: true, attachment }, pendingCookies)
}
