import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { summarizeOpportunities, type GscRowLike } from '@/lib/seo/opportunity-engine'
import { SeoPageDraftForm } from '@/components/admin/SeoPageDraftForm'

export const dynamic = 'force-dynamic'

export default async function AdminSeoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/')

  const admin = createServiceClient()
  const [{ data: gscData }, { data: searchData }, { data: drafts }] = await Promise.all([
    admin
      .from('gsc_rows')
      .select('query,page,impressions,clicks,ctr,position')
      .order('impressions', { ascending: false })
      .limit(2000),
    admin
      .from('site_searches')
      .select('search_query,results_count,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('seo_page_drafts')
      .select('id,concept,subject_code,status,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const rows = (gscData ?? []) as GscRowLike[]
  const summary = summarizeOpportunities(rows)

  const zeroResults = (searchData ?? []).filter(
    (s: { results_count: number | null }) => (s.results_count ?? 0) === 0
  )
  const queryCounts = new Map<string, number>()
  for (const s of searchData ?? []) {
    const q = (s as { search_query: string }).search_query
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1)
  }
  const topSearches = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="ms-h2">SEO opportunity engine</h1>
      <p className="ms-body-2 mt-2">
        Search Console + site search → create / improve / link pages. IndexNow cron pings
        priority URLs daily.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['High priority (11–20)', summary.highPriority],
          ['Optimize (4–10)', summary.optimize],
          ['Defend (1–3)', summary.defend],
          ['Low CTR', summary.lowCtr],
          ['Cannibalization', summary.cannibalization],
          ['GSC rows loaded', rows.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="ec-card p-4">
            <p className="ms-overline">{label}</p>
            <p className="ms-h2 mt-2" style={{ fontSize: '1.75rem' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="ms-h3">Top opportunities</h2>
        {summary.items.length === 0 ? (
          <p className="ms-body-2 mt-3">
            No classified opportunities in this sample yet. Ingest runs Mondays via
            `/api/cron/gsc-ingest`. Meanwhile mine site search below.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {summary.items.slice(0, 25).map((item, i) => (
              <li key={`${item.kind}-${item.query}-${i}`} className="ec-card p-3 text-sm">
                <span className="font-semibold uppercase text-[var(--ec-brand)]">
                  {item.kind}
                </span>{' '}
                · <strong>{item.query}</strong>
                <div className="ms-micro mt-1">
                  {item.note} · impr {item.impressions} · pos{' '}
                  {item.position?.toFixed?.(1) ?? '—'} · {item.page}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="ms-h3">Site search</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="ms-overline">Most searched</p>
            <ul className="mt-2 space-y-1 text-sm">
              {topSearches.length === 0 ? (
                <li className="ms-body-2">No searches logged yet.</li>
              ) : (
                topSearches.map(([q, n]) => (
                  <li key={q}>
                    {q} <span className="text-[var(--ec-text-faint)]">×{n}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="ms-overline">Zero-result searches</p>
            <ul className="mt-2 space-y-1 text-sm">
              {zeroResults.length === 0 ? (
                <li className="ms-body-2">None in the latest sample.</li>
              ) : (
                zeroResults.slice(0, 15).map((s, i) => (
                  <li key={i}>{(s as { search_query: string }).search_query}</li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="ms-h3">Editor-gated page generator</h2>
        <p className="ms-body-2 mt-2">
          AI can help structure drafts; publish only after validation. Drafts never auto-index.
        </p>
        <div className="mt-4">
          <SeoPageDraftForm />
        </div>
        {(drafts ?? []).length > 0 ? (
          <ul className="mt-6 space-y-2 text-sm">
            {(drafts ?? []).map((d) => (
              <li key={d.id} className="ec-card p-3">
                <strong>{d.concept}</strong> · {d.subject_code || '—'} · {d.status}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="mt-10">
        <Link href="/admin/confusion" className="ec-btn-underline">
          Confusion signals →
        </Link>
      </p>
    </div>
  )
}
