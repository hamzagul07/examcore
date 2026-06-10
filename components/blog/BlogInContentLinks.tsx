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
    <nav className="ms-blog-cta-block my-8" aria-label="Primary actions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ms-h3" style={{ fontSize: '1.05rem' }}>
            Mark your paper while this guide is fresh
          </p>
          <p className="ms-body-2" style={{ marginTop: 6 }}>
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
      </div>
    </nav>
  )
}
