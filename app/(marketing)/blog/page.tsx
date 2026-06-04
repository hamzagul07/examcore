import Link from 'next/link'
import { BookOpen, Sparkles, TrendingUp } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getBlogPosts, getBlogPost } from '@/lib/blog'
import {
  getNonSubjectGuidePosts,
  getSubjectGuidePosts,
} from '@/lib/seo/subject-guides'
import { enrichPostMeta, isEditorialPost, sortPostsForIndex } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { BlogIndexJsonLd } from '@/components/seo/BlogPostJsonLd'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const metadata = createPageMetadata({
  title: 'Cambridge A-Level & O-Level blog — trends, subject choice & past papers',
  description:
    'Timely guides for Cambridge students: exam integrity, which subjects to take, May/June 2026 prep, AI rules, leaks & fairness, plus syllabus past-paper guides.',
  path: '/blog',
  keywords: [
    'Cambridge A-Level blog',
    'which A-Level subjects to take',
    'Cambridge exam leaks',
    'O-Level subject choice',
    'May June 2026 exams',
    'Cambridge revision 2026',
    'past paper guides',
  ],
})

function enrichAll(posts: ReturnType<typeof getBlogPosts>) {
  return posts.map((p) => {
    const full = getBlogPost(p.slug)
    return enrichPostMeta(p, full?.content ?? '')
  })
}

export default function BlogIndexPage() {
  const posts = getBlogPosts()
  const enriched = enrichAll(posts)
  const sorted = sortPostsForIndex(enriched)

  const editorial = sorted.filter((p) => isEditorialPost(p.slug, p.category))
  const subjectGuides = enrichAll(getSubjectGuidePosts())
  const generalPosts = sorted.filter(
    (p) =>
      !isSubjectGuideSlug(p.slug) && !isEditorialPost(p.slug, p.category)
  )

  const spotlight = editorial.find((p) => p.spotlight) ?? editorial[0]
  const trending = editorial.filter((p) => p.slug !== spotlight?.slug).slice(0, 4)

  return (
    <MarketingPageShell>
      <BlogIndexJsonLd posts={posts} />
      <PageJsonLd
        path="/blog"
        title="Cambridge A-Level & O-Level blog"
        description="Revision guides, subject choice, exam integrity, and syllabus past-paper guides for Cambridge students."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]}
      />
      <MarketingHero
        label="BLOG"
        title={
          <>
            <span className="gradient-text">What Cambridge students</span>{' '}
            <span className="ec-text-gradient">are talking about now</span>
          </>
        }
        lead="Subject choice, exam-series prep, integrity after online leaks, AI rules, and mark-scheme-first revision — written for A-Level and O-Level, updated for 2026."
      />

      {spotlight && (
        <MarketingSection className="!pt-0">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
            <p className="ec-label-tech">SPOTLIGHT</p>
          </div>
          <BlogPostCard post={spotlight} variant="editorial" />
        </MarketingSection>
      )}

      {trending.length > 0 && (
        <MarketingSection className="!pt-4">
          <p className="ec-label-tech mb-4">TRENDING TOPICS</p>
          <div className="grid gap-5 md:grid-cols-2">
            {trending.map((post) => (
              <BlogPostCard key={post.slug} post={post} variant="editorial" />
            ))}
          </div>
        </MarketingSection>
      )}

      <MarketingSection className="!pt-4">
        <div className="ec-blog-stats mb-10 grid gap-4 sm:grid-cols-3">
          <div className="ec-blog-stat">
            <span className="ec-blog-stat__value">{posts.length}+</span>
            <span className="ec-blog-stat__label">Articles & guides</span>
          </div>
          <div className="ec-blog-stat">
            <span className="ec-blog-stat__value">{editorial.length}</span>
            <span className="ec-blog-stat__label">2026 topic features</span>
          </div>
          <div className="ec-blog-stat">
            <span className="ec-blog-stat__value">{subjectGuides.length}</span>
            <span className="ec-blog-stat__label">Syllabus deep-dives</span>
          </div>
        </div>

        {generalPosts.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ec-label-tech mb-2">MARKING &amp; REVISION</p>
                <h2 className="landing-h3 text-[var(--ec-text-primary)]">
                  Past papers done properly
                </h2>
              </div>
              <Link
                href="/mark"
                className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Try marking free
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {generalPosts.slice(0, 8).map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
            {generalPosts.length > 8 && (
              <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
                Plus {generalPosts.length - 8} more revision guides in the archive below.
              </p>
            )}
          </>
        )}
      </MarketingSection>

      {subjectGuides.length > 0 && (
        <MarketingSection className="!pt-4">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ec-label-tech mb-2">BY SYLLABUS CODE</p>
              <h2 className="landing-h3 text-[var(--ec-text-primary)]">
                Subject past-paper guides
              </h2>
              <p className="mt-2 max-w-2xl text-base text-[var(--ec-text-secondary)]">
                9709, 9702, 9708, 4024, and every code we mark — structure, schemes, mistakes,
                revision plans.
              </p>
            </div>
            <Link
              href="/subjects"
              className="ec-link inline-flex items-center gap-1 text-sm font-semibold"
            >
              <BookOpen className="h-4 w-4" />
              All subjects
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectGuides.map((post) => (
              <BlogPostCard key={post.slug} post={post} variant="compact" />
            ))}
          </div>
        </MarketingSection>
      )}

      <MarketingSection className="!pt-0">
        <div className="ec-blog-cta-banner rounded-2xl border border-[var(--ec-border)] p-8 text-center sm:p-12">
          <p className="ec-label-tech mb-3">READ IT. MARK IT. FIX IT.</p>
          <h2 className="landing-h3 text-[var(--ec-text-primary)]">
            Turn a blog tip into a mark on your next paper
          </h2>
          <p className="landing-lead mx-auto mt-3 max-w-xl">
            Photograph one question tonight — get examiner-style feedback against a real Cambridge
            mark scheme.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/mark" className="ec-btn-primary min-h-[48px] px-8">
              Mark a question free
            </Link>
            <Link href="/auth/signup" className="ec-btn-secondary min-h-[48px] px-8">
              Create account
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-[var(--ec-text-secondary)]">
          <Link href="/guides" className="ec-link">
            Topic guides (hubs)
          </Link>
          {' · '}
          <a href="/feed.xml" className="ec-link">
            RSS feed
          </a>
          {' · '}
          <Link href="/how-it-works" className="ec-link">
            How it works
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
