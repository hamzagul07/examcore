import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cap a single page's recorded time so a stuck/backgrounded tab can't log
// absurd durations.
const MAX_DWELL_MS = 30 * 60 * 1000
// Beacons are tiny; anything larger is not a real page view.
const MAX_BODY_BYTES = 2048
// Matches the client's crypto.randomUUID(). Anything else is dropped, which
// keeps junk out of the table now that this endpoint is public.
const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// UTM values come off a public endpoint, so they are length-capped before they
// reach the table — an unbounded campaign name is a free write amplifier.
const MAX_UTM_LEN = 128

const noContent = () => new NextResponse(null, { status: 204 })

/**
 * First-party page-visit beacon. Called by <VisitTracker> via navigator.sendBeacon
 * on route change / tab hide.
 *
 * Records anonymous visits as well as signed-in ones. It previously dropped
 * everyone who wasn't logged in, which meant the funnel could only ever be
 * measured from signup onwards — the visitor→signup step, almost certainly the
 * biggest leak in the product, was invisible.
 *
 * Privacy: the only identifier stored is a random `session_id` the client keeps
 * in sessionStorage, plus a two-letter country code from the edge. No IP is
 * read or retained, no fingerprint, nothing persisted past the tab. The country
 * exists because pricing was being decided with no idea where anyone is — a
 * single worldwide $19.99 against traffic that peaks at 05:00 UTC — and it is
 * the coarsest signal that answers it. The per-session daily cap is enforced
 * inside `record_page_event` so this stays a single round-trip. Best-effort
 * throughout — never surfaced to the user.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return noContent()

  let body: {
    path?: unknown
    dwellMs?: unknown
    referrer?: unknown
    sessionId?: unknown
    utmSource?: unknown
    utmMedium?: unknown
    utmCampaign?: unknown
    utmContent?: unknown
    utmTerm?: unknown
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return noContent()
  }

  const path =
    typeof body.path === 'string' && body.path.startsWith('/')
      ? body.path.slice(0, 512)
      : null
  if (!path) return noContent()

  const sessionId =
    typeof body.sessionId === 'string' && SESSION_ID_RE.test(body.sessionId)
      ? body.sessionId
      : null
  if (!sessionId) return noContent()

  const dwellRaw = Number(body.dwellMs)
  const dwellMs = Number.isFinite(dwellRaw)
    ? Math.max(0, Math.min(MAX_DWELL_MS, Math.round(dwellRaw)))
    : 0
  const referrer =
    typeof body.referrer === 'string' && body.referrer
      ? body.referrer.slice(0, 512)
      : null

  const utm = (value: unknown): string | null =>
    typeof value === 'string' && value ? value.slice(0, MAX_UTM_LEN) : null

  // Auth is now optional: a null user is an anonymous visitor, not a reason to
  // discard the event.
  const { user } = await authenticateRouteRequest(req)

  // Set by Vercel's edge on every request; absent locally and on other hosts,
  // which simply means no country rather than a bad one. Shape-checked here and
  // again in the RPC — the header is attacker-controllable in principle, and a
  // forged value would quietly skew the one number this exists to answer.
  const countryHeader = req.headers.get('x-vercel-ip-country')?.trim() ?? ''
  const country = /^[A-Za-z]{2}$/.test(countryHeader)
    ? countryHeader.toUpperCase()
    : null

  const service = createServiceClient()
  const { error } = await service.rpc('record_page_event', {
    p_session_id: sessionId,
    p_path: path,
    p_user_id: user?.id ?? null,
    p_referrer: referrer,
    p_dwell_ms: dwellMs,
    p_utm_source: utm(body.utmSource),
    p_utm_medium: utm(body.utmMedium),
    p_utm_campaign: utm(body.utmCampaign),
    p_utm_content: utm(body.utmContent),
    p_utm_term: utm(body.utmTerm),
    p_country: country,
  })
  if (error) console.error('[track] record failed:', error.message)

  return noContent()
}
