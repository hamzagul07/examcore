import Link from 'next/link'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'

type Props = {
  post: EnrichedBlogMeta
}

/** Prototype-style guide card for hub grids. */
export function GuideArticleCard({ post }: Props) {
  return (
    <Link href={`/blog/${post.slug}`} className="ms-guide-card">
      <span className="ms-blog-kw-stamp">{post.categoryLabel}</span>
      <h3 className="ms-gt">{post.title}</h3>
      <div className="ms-gmeta">
        <span className="ms-micro font-mono">{post.readingMinutes} min</span>
        <span className="ms-micro font-mono" style={{ marginLeft: 'auto', letterSpacing: '0.06em' }}>
          READ -&gt;
        </span>
      </div>
    </Link>
  )
}
