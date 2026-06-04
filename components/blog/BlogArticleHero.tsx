import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'
import { formatBlogDate } from '@/lib/blog/meta'

type Props = {
  post: EnrichedBlogMeta
}

export function BlogArticleHero({ post }: Props) {
  const editorial = post.isEditorial || post.category === 'editorial' || post.category === 'subject-choice'

  return (
    <header
      className={`ec-blog-hero relative overflow-hidden rounded-2xl border px-6 py-10 sm:px-10 sm:py-12 ${
        editorial ? 'ec-blog-hero--editorial' : 'border-[var(--ec-border)]'
      }`}
    >
      <div className="ec-blog-hero__mesh" aria-hidden />
      <div className="relative z-[1]">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {post.spotlight ? (
            <span className="ec-blog-chip ec-blog-chip--spotlight">Spotlight</span>
          ) : null}
          <span
            className={`ec-blog-chip ${editorial ? 'ec-blog-chip--editorial' : ''}`}
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
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readingMinutes} min read
          </span>
        </div>

        <h1 className="text-display mt-5 max-w-3xl text-[var(--ec-text-primary)]">
          {post.title}
        </h1>
        {post.description ? (
          <p className="landing-lead mt-5 max-w-2xl">{post.description}</p>
        ) : null}

        {post.keywords.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Topics">
            {post.keywords.slice(0, 5).map((kw) => (
              <li
                key={kw}
                className="rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)]/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--ec-text-secondary)]"
              >
                {kw}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
