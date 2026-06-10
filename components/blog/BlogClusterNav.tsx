import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { getBlogPost } from '@/lib/blog'

type Props = {
  slug: string
}

/** Hub-and-spoke internal link — cluster pillar within ≤3 clicks of home. */
export function BlogClusterNav({ slug }: Props) {
  const cluster = getClusterForSlug(slug)
  const pillar = getBlogPost(cluster.pillarBlogSlug)

  return (
    <nav
      className="ms-blog-aside mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Topic cluster"
    >
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
        <div>
          <p className="ms-overline" style={{ marginBottom: 4 }}>
            Part of
          </p>
          <Link href={cluster.path} className="ms-h3 hover:text-[var(--ec-brand)]">
            {cluster.title}
          </Link>
        </div>
      </div>
      {pillar && pillar.slug !== slug ? (
        <Link href={`/blog/${pillar.slug}`} className="ec-btn-underline text-sm">
          Pillar: {pillar.title.slice(0, 42)}
          {pillar.title.length > 42 ? '…' : ''}
          <ArrowRight className="ml-1 inline h-4 w-4" />
        </Link>
      ) : (
        <Link href={cluster.moneyPath} className="ec-btn-underline text-sm">
          Try marking free
          <ArrowRight className="ml-1 inline h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
