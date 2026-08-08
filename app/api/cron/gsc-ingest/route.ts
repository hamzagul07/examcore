import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Weekly GSC ingest cron.
 * Requires GSC_SITE_URL + GSC_SERVICE_ACCOUNT_JSON (service account invited in GSC).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const siteUrl = process.env.GSC_SITE_URL?.trim()
  const saJson = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()

  if (!siteUrl || !saJson) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      message: 'Set GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON to enable ingest.',
    })
  }

  try {
    const credentials = JSON.parse(saJson) as {
      client_email?: string
      private_key?: string
      [key: string]: unknown
    }
    if (!credentials.client_email || !credentials.private_key) {
      return NextResponse.json(
        { ok: false, error: 'GSC_SERVICE_ACCOUNT_JSON missing client_email/private_key' },
        { status: 500 }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
    const searchconsole = google.searchconsole({ version: 'v1', auth })
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

    // Try URL-prefix property first; fall back to domain property form.
    const siteCandidates = [
      siteUrl,
      siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : `${siteUrl}/`,
      siteUrl.includes('sc-domain:')
        ? siteUrl
        : `sc-domain:${siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
    ]

    let rows: Array<{
      keys?: string[] | null
      clicks?: number | null
      impressions?: number | null
      ctr?: number | null
      position?: number | null
    }> = []
    let usedSite = siteUrl
    let lastError: string | null = null

    for (const candidate of [...new Set(siteCandidates)]) {
      try {
        const res = await searchconsole.searchanalytics.query({
          siteUrl: candidate,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['query', 'page', 'country', 'device'],
            rowLimit: 25000,
          },
        })
        rows = res.data.rows ?? []
        usedSite = candidate
        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      }
    }

    if (lastError && rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: lastError,
          hint: 'Confirm the service account is added as a user on the GSC property and GSC_SITE_URL matches the property (https://markscheme.app/ or sc-domain:markscheme.app).',
        },
        { status: 500 }
      )
    }

    const admin = createServiceClient()
    let upserted = 0
    let skipped = 0
    for (const row of rows) {
      const keys = row.keys ?? []
      const query = keys[0] ?? ''
      const page = keys[1] ?? ''
      if (!query || !page) {
        skipped += 1
        continue
      }
      const { error } = await admin.from('gsc_rows').upsert(
        {
          query,
          page,
          impressions: row.impressions ?? 0,
          clicks: row.clicks ?? 0,
          ctr: row.ctr ?? null,
          position: row.position ?? null,
          country: keys[2] ?? '',
          device: keys[3] ?? '',
          date: endDate,
        },
        { onConflict: 'date,query,page,country,device' }
      )
      if (!error) upserted += 1
      else skipped += 1
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      siteUrl: usedSite,
      rows: rows.length,
      upserted,
      skipped,
      startDate,
      endDate,
      note:
        rows.length === 0
          ? 'GSC returned 0 rows for the last 7 days — normal for brand-new/low-traffic properties; keep Request Indexing + wait for impressions.'
          : undefined,
    })
  } catch (err) {
    console.error('[gsc-ingest]', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'GSC ingest failed',
      },
      { status: 500 }
    )
  }
}
