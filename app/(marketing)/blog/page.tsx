import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getBlogPosts } from '@/lib/blog'
import {
  getNonSubjectGuidePosts,
  getSubjectGuidePosts,
} from '@/lib/seo/subject-guides'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { BlogIndexJsonLd } from '@/components/seo/BlogPostJsonLd'

export const metadata = createPageMetadata({
  title: 'Cambridge past paper tips & mark scheme guides',
  description:
    'Free guides for Cambridge A-Level and O-Level students: per-subject past paper guides (9709, 9702, 9708…), mark schemes, self-marking, and AI marking workflows.',
  path: '/blog',
  keywords: [
    'Cambridge past paper tips',
    'A-Level revision blog',
    'mark scheme guide',
    '9709 past papers guide',
    'past paper self marking',
  ],
})

function PostCard({ post }: { post: ReturnType<typeof getBlogPosts>[number] }) {
  return (
    <Link
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
  )
}

export default function BlogIndexPage() {
  const posts = getBlogPosts()
  const subjectGuides = getSubjectGuidePosts()
  const generalPosts = getNonSubjectGuidePosts()

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
        lead="Per-subject past paper guides for every syllabus we mark, plus mark scheme literacy, self-marking workflows, and honest notes on AI feedback."
      />

      {subjectGuides.length > 0 && (
        <MarketingSection className="!pt-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ec-label-tech mb-2">BY SUBJECT</p>
              <h2 className="landing-h3 text-[var(--ec-text-primary)]">
                Syllabus guides (A-Level &amp; O-Level)
              </h2>
              <p className="mt-2 max-w-2xl text-base text-[var(--ec-text-secondary)]">
                Paper structure, mark scheme conventions, common mistakes, and
                revision plans — one article per Cambridge syllabus code.
              </p>
            </div>
            <Link href="/subjects" className="ec-link text-sm font-semibold">
              All subjects we mark →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjectGuides.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </MarketingSection>
      )}

      <MarketingSection className={subjectGuides.length > 0 ? '!pt-4' : '!pt-0'}>
        {generalPosts.length > 0 && (
          <>
            <p className="ec-label-tech mb-4">GENERAL GUIDES</p>
            <div className="grid gap-6 md:grid-cols-2">
              {generalPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}

        {posts.length === 0 && (
          <div className="ec-card p-10 text-center sm:p-14">
            <p className="landing-lead mx-auto max-w-lg">
              New articles on past papers, mark schemes, and revision — check back
              soon.
            </p>
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
          {' · '}
          <Link href="/subjects" className="ec-link">
            Subjects
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
