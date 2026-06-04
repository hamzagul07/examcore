import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { MONEY_PAGES } from '@/lib/seo/internal-sculpt'

type Props = { slug: string }

/**
 * Reasonable Surfer — high click-probability in-content links (not footer boilerplate).
 */
export function BlogInContentLinks({ slug }: Props) {
  const cluster = getClusterForSlug(slug)

  return (
    <nav
      className="ec-incontent-links my-8 flex flex-col gap-3 rounded-xl border-2 border-[var(--ec-brand)]/35 bg-[color-mix(in_srgb,var(--ec-brand)_10%,transparent)] p-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Primary actions"
    >
      <div>
        <p className="text-sm font-bold text-[var(--ec-text-primary)]">
          Mark your paper while this guide is fresh
        </p>
        <p className="mt-1 text-xs text-[var(--ec-text-secondary)]">
          In-content link — fastest path to scheme-aligned feedback
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={MONEY_PAGES[0]} className="ec-btn-primary inline-flex min-h-[44px] text-sm">
          Mark a question <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={cluster.path}
          className="ec-btn-secondary inline-flex min-h-[44px] text-sm"
        >
          {cluster.title} hub
        </Link>
      </div>
    </nav>
  )
}
