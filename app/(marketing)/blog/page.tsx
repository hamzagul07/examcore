import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getBlogPosts } from '@/lib/blog'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { BlogIndexJsonLd } from '@/components/seo/BlogPostJsonLd'

export const metadata = createPageMetadata({
  title: 'Cambridge past paper tips & mark scheme guides',
  description:
    'Free guides for Cambridge A-Level and O-Level students: how to use past papers, read mark schemes, self-mark maths (B1/M1/A1), essays, MCQs, and when AI marking helps.',
  path: '/blog',
  keywords: [
    'Cambridge past paper tips',
    'A-Level revision blog',
    'mark scheme guide',
    'past paper self marking',
  ],
})

export default function BlogIndexPage() {
  const posts = getBlogPosts()

  return (
    <MarketingPageShell>
      <BlogIndexJsonLd posts={posts} />
      <MarketingHero
        label="BLOG"
        title={
          <>
            <span className="gradient-text">Cambridge past paper</span>{' '}
            <span className="ec-text-gradient">revision guides</span>
          </>
        }
        lead="Mark scheme literacy, self-marking workflows, subject tips, and honest notes on AI feedback — written for A-Level and O-Level students."
      />

      <MarketingSection className="!pt-0">
        {posts.length === 0 ? (
          <div className="ec-card p-10 text-center sm:p-14">
            <p className="landing-lead mx-auto max-w-lg">
              New articles on past papers, mark schemes, and revision — check back
              soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="ec-card ec-card-interactive block p-6 sm:p-8"
              >
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
                <h2 className="landing-h3 mt-3 text-[var(--ec-text-primary)]">
                  {post.title}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-[var(--ec-text-secondary)]">
                  {post.description}
                </p>
                <span className="ec-link mt-4 inline-flex items-center gap-1 text-sm">
                  Read article <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </MarketingSection>

      <MarketingSection className="!pt-0">
        <p className="text-center text-sm text-[var(--ec-text-secondary)]">
          <a href="/feed.xml" className="ec-link">
            RSS feed
          </a>{' '}
          ·{' '}
          <Link href="/mark" className="ec-link">
            Mark a paper free
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
