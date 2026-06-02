import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createBlogPostMetadata } from '@/lib/seo/metadata'
import { getAllBlogSlugs, getBlogPost, getRelatedPosts } from '@/lib/blog'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { BlogPostCta } from '@/components/seo/BlogPostCta'
import { BlogPostJsonLd } from '@/components/seo/BlogPostJsonLd'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return createBlogPostMetadata(post)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const related = getRelatedPosts(slug, 3)

  return (
    <MarketingPageShell narrow>
      <BlogPostJsonLd post={post} />
      <article className="py-16 sm:py-20">
        <Link href="/blog" className="text-sm ec-link">
          ← Back to blog
        </Link>
        <header className="mt-6 mb-10">
          <time
            dateTime={post.date}
            className="font-mono text-xs text-[var(--ec-text-secondary)]"
          >
            {post.date
              ? new Date(post.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : ''}
          </time>
          <h1 className="text-display mt-3 text-[var(--ec-text-primary)]">
            {post.title}
          </h1>
          {post.description ? (
            <p className="landing-lead mt-4">{post.description}</p>
          ) : null}
        </header>
        <div className="prose prose-sm max-w-none prose-headings:text-[var(--ec-text-primary)] prose-p:text-[var(--ec-text-secondary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)] prose-li:text-[var(--ec-text-secondary)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        <BlogPostCta />

        {related.length > 0 && (
          <section className="mt-12 border-t border-[var(--ec-border)] pt-10">
            <p className="ec-label-tech mb-4">RELATED READING</p>
            <ul className="space-y-4">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="text-base font-semibold text-[var(--ec-text-primary)] transition-colors hover:text-[var(--ec-brand)]"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
                    {r.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </MarketingPageShell>
  )
}
