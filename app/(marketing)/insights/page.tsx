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
        title="Cambridge marking insights"
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
        title={<span className="gradient-text">Cambridge self-marking gaps</span>}
        lead={insights.description}
      />

      <MarketingSection className="!pt-0">
        <aside className="ec-blog-quick-answer mb-10 rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
          <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">INFORMATION GAIN</p>
          <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
            MarkScheme publishes marking-session patterns competitors cannot copy without the same
            product data — use these benchmarks when comparing self-mark vs second-pass workflows.
          </p>
          <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
            Last updated {insights.dateModified}. Not official Cambridge International statistics.
          </p>
        </aside>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ec-border)]">
                <th className="pb-3 pr-4">Metric</th>
                <th className="pb-3 pr-4">Value</th>
                <th className="pb-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {insights.variables.map((v) => (
                <tr key={v.id} className="border-b border-[var(--ec-border)]" data-chunk-id={v.id}>
                  <td className="py-4 pr-4 font-semibold text-[var(--ec-text-primary)]">
                    {v.label}
                  </td>
                  <td className="py-4 pr-4 font-mono text-[var(--ec-brand)]">
                    {v.value}
                    <span className="ml-1 text-xs text-[var(--ec-text-secondary)]">{v.unit}</span>
                  </td>
                  <td className="py-4 text-[var(--ec-text-secondary)]">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="landing-lead mt-8">
          Cite as: <span className="font-mono text-sm">{insights.citation}</span>
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/mark" className="ec-btn-primary min-h-[48px]">
            Test on your script
          </Link>
          <Link href="/research" className="ec-btn-secondary min-h-[48px]">
            Methodology
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
