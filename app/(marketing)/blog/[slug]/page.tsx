import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getAllBlogSlugs, getBlogPost } from '@/lib/blog'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return createPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <MarketingPageShell narrow>
      <article className="py-16 sm:py-20">
        <Link
          href="/blog"
          className="text-sm ec-link"
        >
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
        <div className="prose prose-sm max-w-none prose-headings:text-[var(--ec-text-primary)] prose-p:text-[var(--ec-text-secondary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </article>
    </MarketingPageShell>
  )
}
