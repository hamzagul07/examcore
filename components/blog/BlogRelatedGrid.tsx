import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GuideArticleCard } from '@/components/content/GuideArticleCard'
import { enrichPostMeta } from '@/lib/blog/meta'
import { getBlogPost, type BlogPostMeta } from '@/lib/blog'
import { getClusterById, type ContentClusterId } from '@/lib/seo/clusters'

type Props = {
  posts: BlogPostMeta[]
  title?: string
  clusterId?: ContentClusterId
}

const CLUSTER_HUB_LABEL: Partial<Record<ContentClusterId, string>> = {
  ib: 'IB Diploma guide hub',
  'subject-guides': 'Syllabus guides hub',
  'grade-boundaries': 'Grade boundaries hub',
  'command-words': 'Command words hub',
}

export function BlogRelatedGrid({ posts, title, clusterId }: Props) {
  if (!posts.length) return null

  const hub = clusterId ? getClusterById(clusterId) : undefined
  const hubLabel = clusterId ? CLUSTER_HUB_LABEL[clusterId] : undefined
  const resolvedTitle =
    title ??
    (clusterId === 'ib' ? 'More IB revision guides' : 'Related reading')

  return (
    <section className="ms-sec-tight border-t border-[var(--ec-border)] pt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ms-overline">Keep reading</p>
          <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
            {resolvedTitle}
          </h2>
        </div>
        {hub && hubLabel ? (
          <Link href={hub.path} className="ec-btn-underline inline-flex items-center gap-1 text-sm">
            {hubLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="ms-guide-grid">
        {posts.map((p) => {
          const full = getBlogPost(p.slug)
          const enriched = enrichPostMeta(p, full?.content ?? '')
          return <GuideArticleCard key={p.slug} post={enriched} />
        })}
      </div>
    </section>
  )
}
