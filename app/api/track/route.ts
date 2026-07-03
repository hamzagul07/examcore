import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cap a single page's recorded time so a stuck/backgrounded tab can't log
// absurd durations.
const MAX_DWELL_MS = 30 * 60 * 1000

const noContent = () => new NextResponse(null, { status: 204 })

/**
 * First-party page-visit beacon. Called by <VisitTracker> via navigator.sendBeacon
 * on route change / tab hide. Silently drops guests and malformed bodies — this
 * is best-effort telemetry, never surfaced to the user.
 */
export async function POST(req: NextRequest) {
  const { user } = await authenticateRouteRequest(req)
  if (!user) return noContent() // only track signed-in users

  let body: { path?: unknown; dwellMs?: unknown; referrer?: unknown }
  try {
    body = JSON.parse(await req.text())
  } catch {
    return noContent()
  }

  const path =
    typeof body.path === 'string' && body.path.startsWith('/')
      ? body.path.slice(0, 512)
      : null
  if (!path) return noContent()

  const dwellRaw = Number(body.dwellMs)
  const dwellMs = Number.isFinite(dwellRaw)
    ? Math.max(0, Math.min(MAX_DWELL_MS, Math.round(dwellRaw)))
    : 0
  const referrer =
    typeof body.referrer === 'string' && body.referrer
      ? body.referrer.slice(0, 512)
      : null

  const service = createServiceClient()
  const { error } = await service
    .from('page_events')
    .insert({ user_id: user.id, path, referrer, dwell_ms: dwellMs })
  if (error) console.error('[track] insert failed:', error.message)

  return noContent()
}
