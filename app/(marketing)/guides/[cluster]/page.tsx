import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import {
  getAllClusterIds,
  getClusterById,
  type ContentClusterId,
} from '@/lib/seo/clusters'
import { getClusterSpokes } from '@/lib/seo/cluster-spokes'
import { getBlogPosts } from '@/lib/blog'
import { ContentHubNav } from '@/components/content/ContentHubNav'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { GradeBoundaryHubPanel } from '@/components/seo/GradeBoundaryHubPanel'
import { IbResultsSpotlight } from '@/components/seo/IbResultsSpotlight'
import { enrichPostMeta } from '@/lib/blog/meta'
import { SITE_URL } from '@/lib/site-config'
import { groupIbClusterSpokes } from '@/lib/seo/ib-guide-groups'

const IB_GUIDE_PREVIEW = 8

type Props = { params: Promise<{ cluster: string }> }

export async function generateStaticParams() {
  return getAllClusterIds().map((cluster) => ({ cluster }))
}

export async function generateMetadata({ params }: Props) {
  const { cluster: clusterId } = await params
  const cluster = getClusterById(clusterId as ContentClusterId)
  if (!cluster) return {}
  const keywords =
    cluster.id === 'ib'
      ? [cluster.headTerm, 'IB Diploma', 'IB HL SL', 'IB free courses', 'IB markbands']
      : [cluster.headTerm, 'Cambridge A-Level', 'Cambridge O-Level']
  return getPageMetadata(cluster.path, {
    title: `${cluster.title} — ${cluster.headTerm}`,
    description: cluster.description,
    keywords,
  })
}

export default async function ClusterGuidePage({ params }: Props) {
  const { cluster: clusterId } = await params
  const cluster = getClusterById(clusterId as ContentClusterId)
  if (!cluster) notFound()

  const pillarMeta = getBlogPosts().find((p) => p.slug === cluster.pillarBlogSlug)
  const spokeSlugs = getClusterSpokes(cluster.id)
  const spokes = spokeSlugs
    .map((slug) => getBlogPosts().find((p) => p.slug === slug))
    .filter(Boolean)
    .map((p) => enrichPostMeta(p!))
    .sort((a, b) => a.title.localeCompare(b.title))

  const isComparison = cluster.format === 'comparison'
  const isIb = cluster.id === 'ib'
  const isGradeBoundaries = cluster.id === 'grade-boundaries'
  const isCommandWords = cluster.id === 'command-words'
  const ibGroups = isIb ? groupIbClusterSpokes(spokeSlugs) : []
  const allParts = [
    ...(pillarMeta ? [{ name: pillarMeta.title, url: `${SITE_URL}/blog/${pillarMeta.slug}` }] : []),
    ...spokes.map((p) => ({
      name: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={cluster.path}
        title={cluster.title}
        description={cluster.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: cluster.title, path: cluster.path },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: cluster.path,
            name: cluster.title,
            description: cluster.description,
            hasPart: allParts,
          }),
          ...(isIb
            ? [
                itemListNode({
                  name: `${cluster.title} — all guides`,
                  items: spokes.map((p) => ({
                    name: p.title,
                    url: `${SITE_URL}/blog/${p.slug}`,
                  })),
                }),
              ]
            : []),
          ...(isComparison
            ? [
                itemListNode({
                  name: `${cluster.title} — top resources`,
                  items: spokes.slice(0, 8).map((p) => ({
                    name: p.title,
                    url: `${SITE_URL}/blog/${p.slug}`,
                  })),
                }),
              ]
            : []),
        ]}
      />

      <MarketingHero
        label="Guides & blog"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: cluster.title, path: cluster.path },
        ]}
        title={cluster.title}
        lead={cluster.description}
      >
        <ContentHubNav />
      </MarketingHero>

      <MarketingSection className="!pt-0">
        {isGradeBoundaries && <GradeBoundaryHubPanel />}

        {isGradeBoundaries && (
          <div className="mb-10 flex flex-wrap gap-3">
            <Link href="/tools/grade-boundary-calculator" className="ec-btn-primary ec-btn-primary--sm">
              Grade calculator <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/blog/how-to-read-cambridge-grade-boundaries" className="ec-btn-ghost ec-btn-ghost--sm">
              How boundaries work
            </Link>
            <Link href="/blog/cambridge-results-day-august-2026-guide" className="ec-btn-ghost ec-btn-ghost--sm">
              Results day 2026
            </Link>
          </div>
        )}

        {isCommandWords && (
          <div className="mb-10 flex flex-wrap gap-3">
            <Link href="/tools/command-words" className="ec-btn-primary ec-btn-primary--sm">
              Command word tool <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/blog/cambridge-command-words-explained" className="ec-btn-ghost ec-btn-ghost--sm">
              Full guide
            </Link>
          </div>
        )}

        {isIb && (
          <div className="mb-10">
            <IbResultsSpotlight />
          </div>
        )}

        {isIb && (
          <aside className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--ec-border)] px-5 py-4">
            <p className="ms-body-2" style={{ margin: 0, maxWidth: 480 }}>
              Practise on MarkScheme — past papers, free courses, and topic-by-topic marking.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ib/past-papers" className="ec-btn-primary ec-btn-primary--sm">
                IB past papers
              </Link>
              <Link href="/ib/courses" className="ec-btn-secondary ec-btn-secondary--sm">
                Free courses
              </Link>
              <Link href="/ib/topic-practice" className="ec-btn-ghost ec-btn-ghost--sm">
                Topics
              </Link>
            </div>
          </aside>
        )}

        {pillarMeta && (
          <div className="mb-12">
            <p className="ms-overline">Pillar guide</p>
            <BlogPostCard post={enrichPostMeta(pillarMeta)} variant="editorial" />
          </div>
        )}

        {spokes.length > 0 && (
          <div>
            {isIb && ibGroups.length > 0 ? (
              ibGroups.map((group) => {
                const groupPosts = group.slugs
                  .map((slug) => spokes.find((p) => p.slug === slug))
                  .filter(Boolean)
                if (!groupPosts.length) return null
                const preview = groupPosts.slice(0, IB_GUIDE_PREVIEW)
                const remaining = groupPosts.length - preview.length
                return (
                  <div key={group.id} className="mb-12">
                    <p className="ms-overline">{group.label}</p>
                    <ul className="ms-guide-grid sm:grid-cols-2">
                      {preview.map((post) => (
                        <li key={post!.slug}>
                          <BlogPostCard post={post!} variant="compact" />
                        </li>
                      ))}
                    </ul>
                    {remaining > 0 ? (
                      <Link href="/blog/browse/ib" className="ec-btn-underline mt-4 inline-block text-sm">
                        View all {groupPosts.length} {group.label.toLowerCase()} →
                      </Link>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <>
                <p className="ms-overline">
                  {isComparison ? 'Comparison & supporting guides' : 'Supporting articles'}
                </p>
                <ul className="ms-guide-grid sm:grid-cols-2">
                  {spokes.map((post) => (
                    <li key={post.slug}>
                      <BlogPostCard post={post} variant="compact" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Ready to mark a paper?</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            {isIb
              ? 'Put what you learned into practice — upload your answer for criterion-based, band-by-band IB feedback.'
              : 'Put what you learned into practice — upload handwriting and get mark-by-mark feedback from real Cambridge mark schemes.'}
          </p>
          <Link href={cluster.moneyPath} className="ec-btn-primary inline-flex min-h-[48px]">
            {cluster.moneyPath === '/mark'
              ? isIb
                ? 'Practise criterion marking'
                : 'Mark a paper free'
              : 'Browse subjects'}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
