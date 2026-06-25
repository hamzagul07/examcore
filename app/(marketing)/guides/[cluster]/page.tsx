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
import { getBlogPost, getBlogPosts } from '@/lib/blog'
import { ContentHubNav } from '@/components/content/ContentHubNav'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { enrichPostMeta } from '@/lib/blog/meta'
import { SITE_URL } from '@/lib/site-config'

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

  const pillar = getBlogPost(cluster.pillarBlogSlug)
  const spokeSlugs = getClusterSpokes(cluster.id)
  const spokes = spokeSlugs
    .map((slug) => getBlogPosts().find((p) => p.slug === slug))
    .filter(Boolean)
    .map((p) => enrichPostMeta(p!, getBlogPost(p!.slug)?.content ?? ''))
    .sort((a, b) => a.title.localeCompare(b.title))

  const isComparison = cluster.format === 'comparison'
  const isIb = cluster.id === 'ib'

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
            hasPart: [
              ...(pillar
                ? [{ name: pillar.title, url: `${SITE_URL}/blog/${pillar.slug}` }]
                : []),
              ...spokes.slice(0, 12).map((p) => ({
                name: p.title,
                url: `${SITE_URL}/blog/${p.slug}`,
              })),
            ],
          }),
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
        title={cluster.title}
        lead={cluster.description}
      >
        <ContentHubNav />
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <aside className="ms-quick-answer">
          <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 8 }}>
            Quick answer
          </p>
          <p className="ms-body-2" style={{ fontSize: 16, color: 'var(--ec-text-primary)' }}>
            {isComparison
              ? `For "${cluster.headTerm}", use our comparison-style pillar below, then supporting guides — start with official Cambridge PDFs before any paid tool.`
              : isIb
                ? `For "${cluster.headTerm}", read the pillar guide first, then subject revision guides and IA articles below. Practise with criterion marking on MarkScheme when you want band-by-band feedback.`
                : `For "${cluster.headTerm}", read the pillar guide first, then the supporting articles in this hub. Mark handwritten work on MarkScheme when you need a second pass.`}
          </p>
        </aside>

        {isIb && (
          <aside className="ms-hub-card mb-12" aria-label="IB product pages">
            <p className="ms-overline">Practise on MarkScheme</p>
            <h2 className="ms-h3" style={{ marginTop: 8 }}>
              Past papers, courses &amp; topic practice
            </h2>
            <p className="ms-body-2" style={{ marginTop: 8, maxWidth: 560 }}>
              Move from reading to doing — browse IB papers by subject, revise with{' '}
              <strong>760+ free lessons</strong>, or drill one syllabus point at a time.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/ib/past-papers" className="ec-btn-primary ec-btn-primary--sm">
                IB past papers <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/ib/courses" className="ec-btn-secondary ec-btn-secondary--sm">
                Free IB courses
              </Link>
              <Link href="/ib/past-papers/biology-hl#ib-topic-practice" className="ec-btn-ghost ec-btn-ghost--sm">
                Topic practice example
              </Link>
              <Link href="/blog/ib-free-courses-guide" className="ec-btn-underline">
                Free courses guide
              </Link>
            </div>
          </aside>
        )}

        {pillar && (
          <div className="mb-12">
            <p className="ms-overline">Pillar guide</p>
            <BlogPostCard post={enrichPostMeta(pillar, pillar.content)} variant="editorial" />
          </div>
        )}

        {spokes.length > 0 && (
          <div>
            <p className="ms-overline">
              {isComparison ? 'Comparison & supporting guides' : 'Supporting articles'}
            </p>
            <ul className="ms-guide-grid sm:grid-cols-2">
              {spokes.map((post) => (
                <li key={post.slug}>
                  <BlogPostCard post={post} />
                </li>
              ))}
            </ul>
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
      </MarketingSection>
    </MarketingPageShell>
  )
}
