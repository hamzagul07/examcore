import { blogBreadcrumbs } from '@/lib/seo/blog-breadcrumbs'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'

type Props = {
  slug: string
  title: string
}

function truncateTitle(title: string, max = 52): string {
  if (title.length <= max) return title
  const cut = title.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 24 ? cut.slice(0, lastSpace) : cut) + '…'
}

/** Visible breadcrumbs aligned with BlogPostGraphJsonLd cluster trail. */
export function BlogBreadcrumbs({ slug, title }: Props) {
  const crumbs = blogBreadcrumbs(slug, truncateTitle(title))
  return <MarketingBreadcrumbs items={crumbs} className="mb-6" />
}
