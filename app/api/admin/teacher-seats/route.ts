import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { capForTier, teacherMarkCap } from '@/lib/billing/caps'
import { applySeatDecision, listSeatRequests, parseSeatDecisionBody, parseSeatStatus } from '@/lib/teacher/seat-grant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET `?status=pending|approved|declined&cursor` → `{ requests, next_cursor }`.
 * The queue (pending) is oldest first; history is newest first.
 *
 * Admin only (isAdminUser, per request — the /admin proxy gate does not cover
 * /api). Seat requests are service-role-only rows, so the service client is
 * used once the caller is known to be an admin.
 */
export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden.' }, pendingCookies, { status: 403 })
  }

  const url = new URL(request.url)
  const status = parseSeatStatus(url.searchParams.get('status'))
  if (!status) {
    return jsonWithAuthCookies(
      { error: 'status must be pending, approved or declined', field: 'status' },
      pendingCookies,
      { status: 400 }
    )
  }

  try {
    const page = await listSeatRequests(createServiceClient(), {
      status,
      cursor: url.searchParams.get('cursor'),
      limit: Number(url.searchParams.get('limit') ?? '') || undefined,
    })
    return jsonWithAuthCookies(page, pendingCookies, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/teacher-seats] list failed:', err instanceof Error ? err.message : err)
    return jsonWithAuthCookies({ error: 'Could not load requests.' }, pendingCookies, { status: 500 })
  }
}

/**
 * POST `{ request_id, action: 'approve' | 'decline', reason }` →
 * `{ ok, status, emailed }`. A decline needs a reason (the teacher sees it);
 * an approval without one records the school they gave. See
 * lib/teacher/seat-grant.ts for the ordering that keeps two reviewers from
 * both deciding one request.
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden.' }, pendingCookies, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON.' }, pendingCookies, { status: 400 })
  }

  const parsed = parseSeatDecisionBody(body)
  if (!parsed.ok) {
    return jsonWithAuthCookies({ error: parsed.error, field: parsed.field }, pendingCookies, { status: 400 })
  }

  const result = await applySeatDecision(createServiceClient(), parsed.decision, {
    teacherCap: teacherMarkCap(),
    freeCap: capForTier('free'),
  })
  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: result.status })
  }

  console.info('[admin/teacher-seats] decision', {
    reviewer: user?.id ?? null,
    request: parsed.decision.requestId,
    status: result.status,
  })
  return jsonWithAuthCookies({ ok: true, status: result.status, emailed: result.emailed }, pendingCookies)
}
