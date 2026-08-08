import { NextRequest, NextResponse } from 'next/server'
import { runCampaign } from '@/lib/campaigns/send'
import { SEGMENTS } from '@/lib/campaigns/audience'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Run a broadcast campaign from production.
 *
 * The CLI in scripts/send-campaign.ts does the same job, but signs unsubscribe
 * tokens and picks a From address from whatever machine it runs on. Locally
 * that meant the dev signing fallback and a guessed sender — 152 emails with
 * dead unsubscribe links. Here the environment is the real one by construction,
 * which is the whole reason this route exists.
 *
 * Deliberately NOT in vercel.json crons. Campaigns are decided by a person.
 *
 * Auth is the same bearer CRON_SECRET as the scheduled jobs. POST-only for the
 * send: a GET that mails 152 students could be fired by a link scanner, a
 * prefetch, or a browser typing the URL. GET is read-only and answers "what
 * would this send to whom".
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Read-only: segment sizes and campaign state. Sends nothing. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return unauthorized()

  const segments: Record<string, { size: number; description: string }> = {}
  for (const s of Object.values(SEGMENTS)) {
    segments[s.id] = { size: (await s.resolve()).length, description: s.description }
  }

  const admin = createServiceClient()
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('slug, subject, audience, status, created_at, completed_at')
    .order('created_at', { ascending: false })

  const { data: sends } = await admin.from('campaign_sends').select('campaign_id')
  const sentPerCampaign = (sends ?? []).reduce<Record<string, number>>((acc, r) => {
    const id = r.campaign_id as string
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    ok: true,
    segments,
    campaigns: campaigns ?? [],
    total_sends_recorded: Object.values(sentPerCampaign).reduce((a, b) => a + b, 0),
  })
}

/**
 * Run a campaign. Dry run unless `live` is true AND `confirm` equals the slug —
 * the same two-key rule the CLI uses, so the destructive call cannot be made by
 * changing one character of a safe one.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return unauthorized()

  let body: { slug?: string; limit?: number; live?: boolean; confirm?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const slug = body.slug?.trim()
  if (!slug) return NextResponse.json({ error: 'Missing "slug"' }, { status: 400 })

  const live = body.live === true
  if (live && body.confirm !== slug) {
    return NextResponse.json(
      { error: `Refusing live send: "confirm" must equal "${slug}"` },
      { status: 400 }
    )
  }

  // Bounded so one mistyped request cannot empty the whole audience at once,
  // and so the function stays well inside its duration limit.
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100)

  try {
    const result = await runCampaign({ slug, live, limit })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'campaign run failed'
    console.error('[campaign-route]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
