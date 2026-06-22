import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { getUserUsername } from '@/lib/community/require-username'
import { attachmentKindForMime, uploadCommunityFile } from '@/lib/community/uploads'

export const maxDuration = 60

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4MB — Vercel serverless body cap

/** POST /api/community/upload (multipart) — upload one attachment, return its descriptor. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to upload.' }, pendingCookies, { status: 401 })

  const username = await getUserUsername(user.id)
  if (!username) {
    return jsonWithAuthCookies(
      { error: 'Choose a username before uploading.', code: 'no_username' },
      pendingCookies,
      { status: 400 }
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
  if (file.size > MAX_FILE_BYTES) {
    return jsonWithAuthCookies(
      { error: 'File too large — keep attachments under 4 MB.' },
      pendingCookies,
      { status: 413 }
    )
  }
  if (!attachmentKindForMime(file.type)) {
    return jsonWithAuthCookies(
      { error: 'Unsupported file type. Use PDF, images, or office documents.' },
      pendingCookies,
      { status: 415 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const attachment = await uploadCommunityFile({
    buffer,
    mime: file.type,
    originalName: file.name || 'attachment',
    userId: user.id,
  })
  if (!attachment) {
    return jsonWithAuthCookies({ error: 'Upload failed. Try again.' }, pendingCookies, { status: 500 })
  }
  return jsonWithAuthCookies({ ok: true, attachment }, pendingCookies)
}
