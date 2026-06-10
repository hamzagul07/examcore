import Link from 'next/link'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'

type Props = {
  post: EnrichedBlogMeta
}

/** Prototype-style guide card for hub grids. */
export function GuideArticleCard({ post }: Props) {
  return (
    <Link href={`/blog/${post.slug}`} className="ms-guide-card">
      <span className="ec-chip-ms ec-chip-ms--outline">{post.categoryLabel}</span>
      <h3 className="ms-gt">{post.title}</h3>
      <div className="ms-gmeta">
        <span className="ms-micro">{post.readingMinutes} min read</span>
        <span className="ec-btn-underline" style={{ marginLeft: 'auto', fontSize: 13.5 }}>
          read →
        </span>
      </div>
    </Link>
  )
}
