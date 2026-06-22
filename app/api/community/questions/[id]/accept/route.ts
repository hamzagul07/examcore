import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies, createServiceClient } from '@/lib/supabase-server'
import { acceptAnswer } from '@/lib/community/qa'
import { awardXp } from '@/lib/community/xp'

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

  const admin = createServiceClient()
  const { data: answer } = await admin
    .from('community_answers')
    .select('author_id')
    .eq('id', body.answerId)
    .maybeSingle()
  const { data: question } = await admin
    .from('community_questions')
    .select('subject_code')
    .eq('id', id)
    .maybeSingle()
  if (answer?.author_id && question?.subject_code) {
    await awardXp({
      userId: answer.author_id as string,
      kind: 'accepted_answer',
      subjectCode: question.subject_code as string,
      points: 15,
      refId: body.answerId,
    })
  }

  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
