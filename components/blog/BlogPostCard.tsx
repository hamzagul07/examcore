import Link from 'next/link'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'
import { formatBlogDate } from '@/lib/blog/meta'

type Props = {
  post: EnrichedBlogMeta
  variant?: 'default' | 'featured' | 'compact' | 'editorial'
}

export function BlogPostCard({ post, variant = 'default' }: Props) {
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'
  const isEditorial = variant === 'editorial' || post.isEditorial

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`ms-guide-card ms-blog-card group ${isEditorial || isFeatured ? 'ms-blog-card--editorial' : ''} ${isCompact ? 'ms-blog-card--compact' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {post.spotlight ? (
          <span className="ec-chip-ms ec-chip-ms--ok">Spotlight</span>
        ) : null}
        <span className="ec-chip-ms ec-chip-ms--outline">{post.categoryLabel}</span>
        {post.syllabusCode ? (
          <span className="ec-chip-ms ec-chip-ms--outline">{post.syllabusCode}</span>
        ) : null}
        {post.date ? (
          <time dateTime={post.date} className="ms-micro">
            {formatBlogDate(post.date)}
          </time>
        ) : null}
        <span className="ms-micro inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {post.readingMinutes} min
        </span>
      </div>

      <h2 className={`ms-gt ${isFeatured ? 'ms-blog-card__title--featured' : ''}`}>
        {post.title}
      </h2>

      {!isCompact && post.description ? (
        <p className="ms-body-2 line-clamp-3">{post.description}</p>
      ) : null}

      {post.keywords[0] && !isCompact ? (
        <p className="ms-micro font-mono uppercase tracking-wider">{post.keywords[0]}</p>
      ) : null}

      <div className="ms-gmeta">
        <span className="ec-btn-underline inline-flex items-center gap-1.5 text-sm">
          {isCompact ? (
            <>
              <BookOpen className="h-4 w-4" aria-hidden />
              Read guide
            </>
          ) : (
            <>
              Read article
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </div>
    </Link>
  )
}
