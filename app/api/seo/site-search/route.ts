import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { authenticateRouteRequest } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    query?: string
    resultsCount?: number
    clickedResult?: string
    path?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const query = (body.query || '').trim().slice(0, 200)
  if (query.length < 2) return NextResponse.json({ ok: true })

  const { user } = await authenticateRouteRequest(request)
  const admin = createServiceClient()
  await admin.from('site_searches').insert({
    search_query: query,
    results_count:
      typeof body.resultsCount === 'number' ? body.resultsCount : null,
    clicked_result:
      typeof body.clickedResult === 'string'
        ? body.clickedResult.slice(0, 512)
        : null,
    user_type: user ? 'signed_in' : 'anonymous',
    path: typeof body.path === 'string' ? body.path.slice(0, 512) : null,
  })

  return NextResponse.json({ ok: true })
}
