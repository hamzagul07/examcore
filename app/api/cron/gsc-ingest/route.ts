import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Weekly GSC ingest cron.
 *
 * Full API pull requires GSC_SITE_URL + GSC_SERVICE_ACCOUNT_JSON and the
 * `googleapis` package. Until then this cron stays a healthy dry-run so the
 * schedule is live; use /admin/seo with manually imported CSV rows later, or
 * install googleapis and wire credentials.
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
      message:
        'Set GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON, then install googleapis to enable ingest.',
    })
  }

  try {
    // Optional dependency — only resolves when the operator has installed it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mod: any = null
    try {
      mod = await import(/* webpackIgnore: true */ 'googleapis' as string)
    } catch {
      mod = null
    }
    if (!mod?.google) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        message: 'googleapis not installed — run: pnpm add googleapis',
      })
    }

    const { createServiceClient } = await import('@/lib/supabase/service')
    const credentials = JSON.parse(saJson) as Record<string, unknown>
    const auth = new mod.google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
    const searchconsole = mod.google.searchconsole({ version: 'v1', auth })
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page', 'country', 'device'],
        rowLimit: 25000,
      },
    })

    const rows = res.data.rows ?? []
    const admin = createServiceClient()
    let upserted = 0
    for (const row of rows) {
      const keys = row.keys ?? []
      const query = keys[0] ?? ''
      const page = keys[1] ?? ''
      if (!query || !page) continue
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
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      rows: rows.length,
      upserted,
      startDate,
      endDate,
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
