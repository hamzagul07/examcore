import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { itemListNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/compare')

const ROWS = [
  {
    name: 'Self-mark with official mark scheme',
    cost: 'Free',
    speed: 'Slow',
    handwriting: 'N/A',
    strictness: 'Often too generous',
  },
  {
    name: 'MarkScheme (second pass)',
    cost: 'Free tier',
    speed: '~30s per question',
    handwriting: 'Yes — photo upload',
    strictness: 'Scheme-aligned',
  },
  {
    name: 'Private tutor',
    cost: 'High',
    speed: 'Days to weeks',
    handwriting: 'Sometimes',
    strictness: 'Depends on tutor',
  },
]

export default function ComparePage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/compare"
        title="Compare Cambridge marking options"
        description="Self-marking, MarkScheme, and tutor feedback compared."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
        ]}
      />
      <JsonLd
        data={itemListNode({
          name: 'Cambridge past paper marking options',
          items: ROWS.map((r) => ({ name: r.name })),
        })}
      />
      <MarketingHero
        label="COMPARISON"
        title="Which marking path fits you?"
        lead="Not affiliate fluff — a practical table for students revising with Cambridge past papers."
      />
      <MarketingSection className="!pt-0">
        <div className="ms-compare-scroll overflow-x-auto">
          <table className="ec-blog-prose w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr>
                <th className="pb-3 pr-4">Option</th>
                <th className="pb-3 pr-4">Cost</th>
                <th className="pb-3 pr-4">Speed</th>
                <th className="pb-3 pr-4">Handwriting</th>
                <th className="pb-3">Strictness</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name} className="border-t border-[var(--ec-border)]">
                  <td className="py-3 pr-4 font-semibold text-[var(--ec-text-primary)]">
                    {r.name}
                  </td>
                  <td className="py-3 pr-4">{r.cost}</td>
                  <td className="py-3 pr-4">{r.speed}</td>
                  <td className="py-3 pr-4">{r.handwriting}</td>
                  <td className="py-3">{r.strictness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="landing-lead mt-8">
          Best workflow: self-mark strictly once, then{' '}
          <Link href="/mark" className="ec-link font-semibold">
            MarkScheme
          </Link>{' '}
          on the same script for a second pass before your next paper.
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
