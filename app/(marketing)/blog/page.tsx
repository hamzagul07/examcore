import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getBlogPosts } from '@/lib/blog'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'Blog',
  description:
    'Exam tips, study strategies, and updates from the MarkScheme build — articles for Cambridge A-Level students.',
  path: '/blog',
})

export default function BlogIndexPage() {
  const posts = getBlogPosts()

  return (
    <MarketingPageShell>
      <MarketingHero
        label="BLOG"
        title={<span className="gradient-text">Articles & updates</span>}
        lead="Exam tips, study strategies, and notes from the build."
      />

      <MarketingSection className="!pt-0">
        {posts.length === 0 ? (
          <div className="ec-card p-10 text-center sm:p-14">
            <p className="landing-lead mx-auto max-w-lg">
              Articles coming soon — exam tips, study strategies, and updates
              from the build.
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
    </MarketingPageShell>
  )
}
