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
      className={`ec-blog-card group block ${isFeatured ? 'ec-blog-card--featured' : ''} ${isEditorial ? 'ec-blog-card--editorial' : ''} ${isCompact ? 'ec-blog-card--compact' : ''}`}
    >
      <div className="ec-blog-card__glow" aria-hidden />
      <div className="ec-blog-card__inner">
        <div className="flex flex-wrap items-center gap-2">
          {post.spotlight ? (
            <span className="ec-blog-chip ec-blog-chip--spotlight">Spotlight</span>
          ) : null}
          <span
            className={`ec-blog-chip ${isEditorial ? 'ec-blog-chip--editorial' : ''}`}
          >
            {post.categoryLabel}
          </span>
          {post.syllabusCode ? (
            <span className="ec-blog-chip ec-blog-chip--code">{post.syllabusCode}</span>
          ) : null}
          {post.date ? (
            <time dateTime={post.date} className="ec-blog-meta">
              {formatBlogDate(post.date)}
            </time>
          ) : null}
          <span className="ec-blog-meta inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {post.readingMinutes} min read
          </span>
        </div>

        <h2
          className={
            isFeatured
              ? 'mt-4 text-2xl font-bold leading-tight tracking-tight text-[var(--ec-text-primary)] sm:text-3xl'
              : isCompact
                ? 'mt-3 text-base font-semibold leading-snug text-[var(--ec-text-primary)]'
                : 'landing-h3 mt-4 text-[var(--ec-text-primary)]'
          }
        >
          {post.title}
        </h2>

        {!isCompact && post.description ? (
          <p className="mt-3 line-clamp-3 text-base leading-relaxed text-[var(--ec-text-secondary)]">
            {post.description}
          </p>
        ) : null}

        {post.keywords[0] && !isCompact ? (
          <p className="ec-blog-keyword mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--ec-text-secondary)]">
            {post.keywords[0]}
          </p>
        ) : null}

        <span className="ec-blog-card__cta mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]">
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
