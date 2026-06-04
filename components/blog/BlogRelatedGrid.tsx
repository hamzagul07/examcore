import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { enrichPostMeta } from '@/lib/blog/meta'
import { getBlogPost, type BlogPostMeta } from '@/lib/blog'

type Props = {
  posts: BlogPostMeta[]
  title?: string
}

export function BlogRelatedGrid({ posts, title = 'Related reading' }: Props) {
  if (!posts.length) return null

  return (
    <section className="mt-14 border-t border-[var(--ec-border)] pt-12">
      <p className="ec-label-tech mb-2">KEEP READING</p>
      <h2 className="landing-h3 text-[var(--ec-text-primary)]">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const full = getBlogPost(p.slug)
          const enriched = enrichPostMeta(p, full?.content ?? '')
          return <BlogPostCard key={p.slug} post={enriched} variant="compact" />
        })}
      </div>
    </section>
  )
}
