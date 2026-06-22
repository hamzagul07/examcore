import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { createAnswer } from '@/lib/community/qa'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to answer.' }, pendingCookies, { status: 401 })
  const { id } = await params
  let body: { bodyMd?: string; subjectName?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid body.' }, pendingCookies, { status: 400 })
  }
  const admin = createServiceClient()
  const { data: profile } = await admin.from('user_profiles').select('username').eq('id', user.id).maybeSingle()
  if (!profile?.username) {
    return jsonWithAuthCookies({ error: 'Choose a username first.', code: 'no_username' }, pendingCookies, { status: 400 })
  }
  const result = await createAnswer({
    questionId: id,
    authorId: user.id,
    bodyMd: body.bodyMd || '',
    subjectName: body.subjectName,
  })
  if (!result.ok) return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  return jsonWithAuthCookies({ ok: true, id: result.id, status: result.status, reason: result.reason ?? null }, pendingCookies)
}
