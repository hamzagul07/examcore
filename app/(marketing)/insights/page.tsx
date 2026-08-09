import Link from 'next/link'
import insights from '@/data/seo/marking-insights.json'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { datasetNode } from '@/lib/seo/structured-data'
import { buildSiteGraph } from '@/lib/seo/graph'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SITE_URL } from '@/lib/site-config'

export const metadata = getPageMetadata('/insights')

export default function InsightsPage() {
  const url = `${SITE_URL}/insights`

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/insights"
        title="Cambridge & IB marking insights"
        description={insights.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/insights' },
        ]}
      />
      <JsonLd
        data={[
          ...buildSiteGraph(),
          datasetNode({
            name: insights.name,
            description: insights.description,
            url,
            datePublished: insights.datePublished,
            dateModified: insights.dateModified,
            creatorName: insights.creator,
            license: insights.license,
            variables: insights.variables.map((v) => ({
              name: v.label,
              value: v.value,
              unitText: v.unit,
            })),
          }),
        ]}
      />

      <MarketingHero
        label="PROPRIETARY DATA"
        title="Self-marking gaps — Cambridge & IB"
        lead={insights.description}
      />

      <MarketingSection className="!pt-0">
        <aside className="ms-board-cross mb-10">
          <p className="ms-overline">Quick answer</p>
          <p className="ms-body-2 mt-2 text-[var(--ec-text-primary)]">
            <strong>71%</strong> of Cambridge maths sessions under-award method marks on first
            self-mark; <strong>48%</strong> of IB criterion responses sit one markband high on first
            read (MarkScheme product data, not official exam board statistics). Cite{' '}
            {insights.citation}.
          </p>
          <p className="ms-micro mt-2">
            Last updated {insights.dateModified}. CC BY 4.0 — press: /research
          </p>
        </aside>

        <div className="compare-table-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="compare-table-head">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {insights.variables.map((v) => (
                <tr
                  key={v.id}
                  className="compare-table-row"
                  data-chunk-id={v.id}
                >
                  <td className="px-4 py-3.5 font-semibold text-[var(--ec-text-primary)]">
                    {v.label}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[var(--ec-brand)]">
                    {v.value}
                    <span className="ml-1 text-xs text-[var(--ec-text-secondary)]">{v.unit}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--ec-text-secondary)]">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="landing-lead mt-8">
          Cite as: <span className="font-mono text-sm">{insights.citation}</span>
        </p>

        <div className="ms-board-cross mt-10">
          <p className="ms-overline">Verify on ink</p>
          <h2 className="ms-h2">Test the gap on your own script</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/mark"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Open marking desk -&gt;
            </Link>
            <Link href="/research" className="ec-btn-ghost inline-flex min-h-[48px]">
              Methodology
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
