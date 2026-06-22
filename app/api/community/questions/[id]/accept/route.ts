import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { acceptAnswer } from '@/lib/community/qa'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in.' }, pendingCookies, { status: 401 })
  const { id } = await params
  let body: { answerId?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid body.' }, pendingCookies, { status: 400 })
  }
  if (!body.answerId) return jsonWithAuthCookies({ error: 'Missing answer.' }, pendingCookies, { status: 400 })
  const ok = await acceptAnswer(id, body.answerId, user.id)
  if (!ok) {
    return jsonWithAuthCookies({ error: 'Only the question author can accept an answer.' }, pendingCookies, { status: 403 })
  }
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
