import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import { getClusterSpokes } from '@/lib/seo/cluster-spokes'
import { getBlogPost } from '@/lib/blog'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SITE_URL } from '@/lib/site-config'
import { ContentHubNav } from '@/components/content/ContentHubNav'
import { FeaturedGuideBlock } from '@/components/content/FeaturedGuideBlock'
import { GuideArticleCard } from '@/components/content/GuideArticleCard'
import { getFeaturedHubPost, getGuideGridPosts } from '@/lib/content/hub-display'

export const metadata = getPageMetadata('/guides')

export default function GuidesIndexPage() {
  const parts = CONTENT_CLUSTERS.map((c) => {
    const pillar = getBlogPost(c.pillarBlogSlug)
    return {
      name: c.title,
      url: `${SITE_URL}${c.path}`,
      pillarTitle: pillar?.title ?? c.title,
    }
  })

  const featured = getFeaturedHubPost()
  const guideGrid = getGuideGridPosts(featured?.slug, 6)

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
        label="Guides & blog"
        title={
          <>
            Read the examiner&apos;s <em>mind.</em>
          </>
        }
        lead="Short, specific guides on how Cambridge actually marks — written from the schemes, not vibes. Browse topic hubs or read individual articles on the blog."
      >
        <ContentHubNav />
      </MarketingHero>

      {featured && (
        <MarketingSection className="!pt-0">
          <FeaturedGuideBlock post={featured} />
        </MarketingSection>
      )}

      {guideGrid.length > 0 && (
        <MarketingSection className="!pt-12">
          <p className="ms-overline">From the blog</p>
          <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
            Latest marking &amp; revision guides
          </h2>
          <div className="ms-guide-grid" style={{ marginTop: 24 }}>
            {guideGrid.map((post) => (
              <GuideArticleCard key={post.slug} post={post} />
            ))}
          </div>
          <p className="ms-micro" style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/blog" className="ec-btn-underline">
              Browse all articles →
            </Link>
          </p>
        </MarketingSection>
      )}

      <MarketingSection className="!pt-12">
        <p className="ms-overline">Topic hubs</p>
        <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
          Built for search intent
        </h2>
        <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 620 }}>
          Each hub is a pillar article plus supporting guides — comparison lists where you need
          rankings, step-by-step workflows where you need how-tos, and syllabus depth where you
          need 9709-level detail.
        </p>

        <div className="ms-hub-grid" style={{ marginTop: 28 }}>
          {CONTENT_CLUSTERS.map((cluster) => {
            const pillar = getBlogPost(cluster.pillarBlogSlug)
            const spokeCount = getClusterSpokes(cluster.id).length
            return (
              <article key={cluster.id} className="ms-hub-card">
                <span className="ec-chip-ms ec-chip-ms--outline">{cluster.headTerm}</span>
                <h3 className="ms-h3" style={{ marginTop: 12 }}>
                  <Link href={cluster.path} className="hover:text-[var(--ec-brand)]">
                    {cluster.title}
                  </Link>
                </h3>
                <p className="ms-body-2 flex-1" style={{ marginTop: 8 }}>
                  {cluster.description}
                </p>
                <p className="ms-micro" style={{ marginTop: 12 }}>
                  {spokeCount + 1} articles · Pillar:{' '}
                  {pillar ? (
                    <Link href={`/blog/${pillar.slug}`} className="ec-btn-underline">
                      {pillar.title.slice(0, 48)}
                      {pillar.title.length > 48 ? '…' : ''}
                    </Link>
                  ) : (
                    cluster.pillarBlogSlug
                  )}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={cluster.path} className="ec-btn-ghost ec-btn-ghost--sm">
                    Open hub <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={cluster.moneyPath} className="ec-btn-underline">
                    {cluster.moneyPath === '/mark' ? 'Mark a paper' : 'View subjects'}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        <div className="ms-hub-card ms-hub-cta">
          <p className="ms-greennote" style={{ margin: 0, flex: 1, minWidth: 240 }}>
            guides tell you how marks work — the courses make you earn them ↓
          </p>
          <Link href="/courses" className="ec-btn-primary ec-btn-primary--sm">
            Free courses
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
