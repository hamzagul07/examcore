import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import {
  getAllClusterIds,
  getClusterById,
  getClusterSpokes,
  type ContentClusterId,
} from '@/lib/seo/clusters'
import { getBlogPost, getBlogPosts } from '@/lib/blog'
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
  return getPageMetadata(cluster.path, {
    title: `${cluster.title} — ${cluster.headTerm}`,
    description: cluster.description,
    keywords: [cluster.headTerm, 'Cambridge A-Level', 'Cambridge O-Level'],
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

  const isComparison = cluster.format === 'comparison'

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
        label="TOPIC HUB"
        title={<span className="gradient-text">{cluster.title}</span>}
        lead={cluster.description}
      />

      <MarketingSection className="!pt-0">
        <aside className="ec-blog-quick-answer mb-10 rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
          <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK ANSWER</p>
          <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
            {isComparison
              ? `For "${cluster.headTerm}", use our comparison-style pillar below, then supporting guides — start with official Cambridge PDFs before any paid tool.`
              : `For "${cluster.headTerm}", read the pillar guide first, then the supporting articles in this hub. Mark handwritten work on MarkScheme when you need a second pass.`}
          </p>
        </aside>

        {pillar && (
          <div className="mb-12">
            <p className="ec-label-tech mb-4">PILLAR GUIDE</p>
            <BlogPostCard post={enrichPostMeta(pillar, pillar.content)} variant="editorial" />
          </div>
        )}

        {spokes.length > 0 && (
          <div>
            <p className="ec-label-tech mb-4">
              {isComparison ? 'COMPARISON & SUPPORTING GUIDES' : 'SUPPORTING ARTICLES'}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {spokes.map((post) => (
                <li key={post.slug}>
                  <BlogPostCard post={post} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ec-card mt-12 p-8 text-center">
          <h2 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">
            Ready to mark a paper?
          </h2>
          <p className="landing-lead mb-6 mx-auto max-w-lg">
            Put what you learned into practice — upload handwriting and get mark-by-mark
            feedback from real Cambridge mark schemes.
          </p>
          <Link href={cluster.moneyPath} className="ec-btn-primary inline-flex min-h-[48px]">
            {cluster.moneyPath === '/mark' ? 'Mark a paper free' : 'Browse subjects'}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
