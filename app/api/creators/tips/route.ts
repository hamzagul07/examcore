import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { getCreatorByUserId } from '@/lib/creators/service'
import { createTipTest } from '@/lib/creators/tips'

/** A creator turns a tip into a marked question (docs/CREATORS_PROGRAM.md). */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in first.' }, pendingCookies, { status: 401 })
  const creator = await getCreatorByUserId(user.id)
  if (!creator || creator.status !== 'active') {
    return jsonWithAuthCookies({ error: 'No active creator seat.' }, pendingCookies, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON body' }, pendingCookies, { status: 400 })
  }
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '')
  const result = await createTipTest({
    creatorId: creator.userId,
    title: str('title'),
    tip: str('tip'),
    subjectCode: str('subjectCode'),
    questionText: str('questionText'),
    totalMarks: Number(body.totalMarks),
  })
  if (!result.ok) return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  return jsonWithAuthCookies(
    { ok: true, tip: result.tip, href: `/with/${creator.handle}/${result.tip.slug}` },
    pendingCookies
  )
}
