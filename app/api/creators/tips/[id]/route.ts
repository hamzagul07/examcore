import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { getCreatorByUserId } from '@/lib/creators/service'
import { getTipTest, setTipTestStatus } from '@/lib/creators/tips'

type Ctx = { params: Promise<{ id: string }> }

/** Public: what the mark page needs to prefill a tip test. Active seats and tips only. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const tip = await getTipTest(id)
  if (!tip || tip.status !== 'active') return NextResponse.json({ tip: null }, { status: 404 })
  const creator = await getCreatorByUserId(tip.creatorId)
  if (!creator || creator.status !== 'active') {
    return NextResponse.json({ tip: null }, { status: 404 })
  }
  return NextResponse.json(
    {
      tip: {
        id: tip.id,
        slug: tip.slug,
        title: tip.title,
        tip: tip.tip,
        subjectCode: tip.subjectCode,
        subjectLabel: tip.subjectLabel,
        questionText: tip.questionText,
        totalMarks: tip.totalMarks,
      },
      creator: { handle: creator.handle, code: creator.code, displayName: creator.displayName },
    },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } }
  )
}

/** The owner pauses or resumes a tip test. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in first.' }, pendingCookies, { status: 401 })
  let body: { status?: unknown } = {}
  try {
    body = (await request.json()) as { status?: unknown }
  } catch {
    body = {}
  }
  const status = body.status === 'paused' ? 'paused' : body.status === 'active' ? 'active' : null
  if (!status) return jsonWithAuthCookies({ error: 'status must be active or paused' }, pendingCookies, { status: 400 })
  const ok = await setTipTestStatus(id, user.id, status)
  return jsonWithAuthCookies({ ok }, pendingCookies, { status: ok ? 200 : 404 })
}
