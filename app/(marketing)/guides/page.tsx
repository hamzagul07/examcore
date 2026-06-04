import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import { getClusterSpokes } from '@/lib/seo/clusters'
import { getBlogPost } from '@/lib/blog'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SITE_URL } from '@/lib/site-config'

export const metadata = createPageMetadata({
  title: 'Cambridge past paper guides — topic hubs',
  description:
    'Hub-and-spoke guides for Cambridge A-Level and O-Level: marking workflows, mark schemes, subject choice, syllabus codes, and 2026 exam prep — all interlinked.',
  path: '/guides',
  keywords: ['Cambridge study guides', 'past paper hub', 'A-Level revision topics'],
})

export default function GuidesIndexPage() {
  const parts = CONTENT_CLUSTERS.map((c) => {
    const pillar = getBlogPost(c.pillarBlogSlug)
    return {
      name: c.title,
      url: `${SITE_URL}${c.path}`,
      pillarTitle: pillar?.title ?? c.title,
    }
  })

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/guides"
        title="Cambridge past paper guides"
        description="Topic hubs for Cambridge past paper marking, mark schemes, revision, and subject choice."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
        ]}
      />
      <JsonLd
        data={collectionPageNode({
          path: '/guides',
          name: 'MarkScheme topic guides',
          description:
            'Hub-and-spoke guides for Cambridge A-Level and O-Level past paper marking, mark schemes, revision, and subject choice.',
          hasPart: parts.map((p) => ({ name: p.name, url: p.url })),
        })}
      />

      <MarketingHero
        label="GUIDES"
        title={
          <>
            <span className="gradient-text">Topic hubs</span>{' '}
            <span className="ec-text-gradient">built for search intent</span>
          </>
        }
        lead="Each hub is a pillar page plus supporting articles — comparison lists where you need rankings, step-by-step workflows where you need how-tos, and syllabus depth where you need 9709-level detail."
      />

      <MarketingSection className="!pt-0">
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTENT_CLUSTERS.map((cluster) => {
            const pillar = getBlogPost(cluster.pillarBlogSlug)
            const spokeCount = getClusterSpokes(cluster.id).length
            return (
              <article
                key={cluster.id}
                className="ec-card ec-card-interactive flex flex-col p-6 sm:p-8"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
                  <span className="ec-label-tech">{cluster.headTerm}</span>
                </div>
                <h2 className="landing-h3 mt-3 text-[var(--ec-text-primary)]">
                  <Link href={cluster.path}>{cluster.title}</Link>
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  {cluster.description}
                </p>
                <p className="mt-3 text-xs text-[var(--ec-text-secondary)]">
                  {spokeCount + 1} articles · Pillar:{' '}
                  {pillar ? (
                    <Link href={`/blog/${pillar.slug}`} className="ec-link">
                      {pillar.title.slice(0, 48)}
                      {pillar.title.length > 48 ? '…' : ''}
                    </Link>
                  ) : (
                    cluster.pillarBlogSlug
                  )}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={cluster.path} className="ec-btn-secondary inline-flex min-h-[44px] text-sm">
                    Open hub <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={cluster.moneyPath} className="ec-link inline-flex min-h-[44px] items-center text-sm font-semibold">
                    {cluster.moneyPath === '/mark' ? 'Mark a paper' : 'View subjects'}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
