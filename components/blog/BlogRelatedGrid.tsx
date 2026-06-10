import { GuideArticleCard } from '@/components/content/GuideArticleCard'
import { enrichPostMeta } from '@/lib/blog/meta'
import { getBlogPost, type BlogPostMeta } from '@/lib/blog'

type Props = {
  posts: BlogPostMeta[]
  title?: string
}

export function BlogRelatedGrid({ posts, title = 'Related reading' }: Props) {
  if (!posts.length) return null

  return (
    <section className="ms-sec-tight border-t border-[var(--ec-border)] pt-12">
      <p className="ms-overline">Keep reading</p>
      <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
        {title}
      </h2>
      <div className="ms-guide-grid mt-6">
        {posts.map((p) => {
          const full = getBlogPost(p.slug)
          const enriched = enrichPostMeta(p, full?.content ?? '')
          return <GuideArticleCard key={p.slug} post={enriched} />
        })}
      </div>
    </section>
  )
}
