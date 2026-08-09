import Link from 'next/link'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'
import { formatBlogDate } from '@/lib/blog/meta'
import { ContentHubNav } from '@/components/content/ContentHubNav'

type Props = {
  post: EnrichedBlogMeta
}

export function BlogArticleHero({ post }: Props) {
  return (
    <header className="ms-content-hero">
      <Link
        href="/blog"
        className="inline-flex min-h-[44px] items-center gap-1.5 font-mono text-[12px] font-semibold tracking-wide text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
      >
        <span aria-hidden>&lt;-</span>
        Guides &amp; blog
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {post.spotlight ? (
          <span className="ms-blog-kw-stamp" style={{ color: 'var(--ec-brand)', borderColor: 'var(--ec-brand-border)' }}>
            Spotlight
          </span>
        ) : null}
        <span className="ms-blog-kw-stamp">{post.categoryLabel}</span>
        {post.syllabusCode ? (
          <span className="ms-blog-kw-stamp" style={{ color: 'var(--ec-brand)' }}>
            {post.syllabusCode}
          </span>
        ) : null}
        {post.date ? (
          <time dateTime={post.date} className="ms-micro">
            {formatBlogDate(post.date)}
          </time>
        ) : null}
        <span className="ms-micro inline-flex items-center gap-1 font-mono">
          <span aria-hidden>·</span>
          {post.readingMinutes} min read
        </span>
      </div>

      <h1 className="ms-h2" style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', marginTop: 20 }}>
        {post.title}
      </h1>
      {post.description ? (
        <p className="ms-lead ms-blog-hero-lead" style={{ marginTop: 16 }}>
          {post.description}
        </p>
      ) : null}

      {post.keywords.length > 0 && (
        <ul className="ms-hub-strip" style={{ marginTop: 20 }} aria-label="Topics">
          {post.keywords.slice(0, 5).map((kw) => (
            <li key={kw}>
              <span className="ms-blog-kw-stamp">{kw}</span>
            </li>
          ))}
        </ul>
      )}

      <ContentHubNav />
    </header>
  )
}
