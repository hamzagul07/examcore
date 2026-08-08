import { NextResponse } from 'next/server'
import { pingIndexNow, pingIndexNowPriority } from '@/lib/seo/indexnow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/seo/indexnow
 * Auth: Authorization: Bearer $CRON_SECRET (same as other crons).
 * Body optional: { "paths": ["/results-2026", ...] } — defaults to priority list.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization') || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let paths: string[] | null = null
  try {
    const body = (await request.json()) as { paths?: string[] }
    if (Array.isArray(body.paths)) {
      paths = body.paths.filter((p) => typeof p === 'string' && p.startsWith('/'))
    }
  } catch {
    // empty body → priority list
  }

  const result = paths?.length ? await pingIndexNow(paths) : await pingIndexNowPriority()
  return NextResponse.json(result)
}
