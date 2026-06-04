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
      className="mt-6 flex flex-col gap-3 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)]/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Topic cluster"
    >
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ec-text-secondary)]">
            Part of
          </p>
          <Link href={cluster.path} className="text-sm font-semibold text-[var(--ec-text-primary)] hover:text-[var(--ec-brand)]">
            {cluster.title}
          </Link>
        </div>
      </div>
      {pillar && pillar.slug !== slug ? (
        <Link
          href={`/blog/${pillar.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ec-brand)]"
        >
          Pillar guide: {pillar.title.slice(0, 42)}
          {pillar.title.length > 42 ? '…' : ''}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <Link
          href={cluster.moneyPath}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ec-brand)]"
        >
          Try marking free
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
