import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { authenticateRouteRequest } from '@/lib/supabase-server'
import {
  clientIp,
  consumeSearchLogSlot,
  RateLimitUnavailableError,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Bounds on what one row may hold. The client already trims the query to 200;
 * the server caps it too because the client is not the only caller.
 */
const MAX_QUERY_CHARS = 200
const MIN_QUERY_CHARS = 2
const MAX_FIELD_CHARS = 512

/**
 * First-party search intent, logged for the SEO opportunity engine.
 *
 * Unauthenticated by design (guests search too), which made it a free insert
 * into site_searches for anyone with curl. The daily per-IP cap bounds the
 * table's growth from one caller without touching a real session, which logs
 * one row per chat message sent. (Code review 2026-09-25, §3.)
 */
export async function POST(request: NextRequest) {
  let body: {
    query?: unknown
    resultsCount?: unknown
    clickedResult?: unknown
    path?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const query =
    typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_CHARS) : ''
  if (query.length < MIN_QUERY_CHARS) return NextResponse.json({ ok: true })

  const admin = createServiceClient()
  const ip = clientIp(request)
  try {
    const slot = await consumeSearchLogSlot(admin, ip)
    if (!slot.allowed) return rateLimitJson(slot.message)
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      // Analytics only: nothing the caller can act on, and the client does not
      // read this response.
      return NextResponse.json({ ok: false }, { status: 503 })
    }
    throw err
  }

  const { user } = await authenticateRouteRequest(request)
  await admin.from('site_searches').insert({
    search_query: query,
    results_count:
      typeof body.resultsCount === 'number' && Number.isFinite(body.resultsCount)
        ? Math.max(0, Math.round(body.resultsCount))
        : null,
    clicked_result:
      typeof body.clickedResult === 'string'
        ? body.clickedResult.slice(0, MAX_FIELD_CHARS)
        : null,
    user_type: user ? 'signed_in' : 'anonymous',
    path: typeof body.path === 'string' ? body.path.slice(0, MAX_FIELD_CHARS) : null,
  })

  return NextResponse.json({ ok: true })
}
