import Link from 'next/link'
import type { CSSProperties } from 'react'

import type { EnrichedBlogMeta } from '@/lib/blog/meta'
import { formatBlogDate } from '@/lib/blog/meta'
import { subjectAccent, subjectGlyph, accentCssVar } from '@/lib/courses/margin-notes/subject-meta'

type Props = {
  post: EnrichedBlogMeta
  variant?: 'default' | 'featured' | 'compact' | 'editorial'
}

export function BlogPostCard({ post, variant = 'default' }: Props) {
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'
  const isEditorial = variant === 'editorial' || post.isEditorial
  const code = post.syllabusCode

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`ms-guide-card ms-blog-card group ec-card-accent-edge ${code ? 'subject-accented' : ''} ${isEditorial || isFeatured ? 'ms-blog-card--editorial' : ''} ${isCompact ? 'ms-blog-card--compact' : ''}`}
      style={code ? ({ '--acc': accentCssVar(subjectAccent(code)) } as CSSProperties) : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        {post.spotlight ? (
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-label="Spotlight">
            HOT
          </span>
        ) : null}
        <span className="ms-blog-kw-stamp">{post.categoryLabel}</span>
        {code ? (
          <span className="ec-chip ec-chip-accent subject-accented" style={{ '--acc': accentCssVar(subjectAccent(code)) } as CSSProperties}>
            <span aria-hidden="true">{subjectGlyph(code, '')}</span> {code}
          </span>
        ) : null}
        {post.date ? (
          <time dateTime={post.date} className="ms-micro">
            {formatBlogDate(post.date)}
          </time>
        ) : null}
        <span className="ms-micro inline-flex items-center gap-1 font-mono">
          {post.readingMinutes}m
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
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                ¶
              </span>
              Read guide
            </>
          ) : (
            <>
              Read article
              <span className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden>-&gt;</span>
            </>
          )}
        </span>
      </div>
    </Link>
  )
}
