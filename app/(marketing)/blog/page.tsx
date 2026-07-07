import Link from 'next/link'
import { BookOpen, Sparkles, TrendingUp } from 'lucide-react'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { getBlogPosts } from '@/lib/blog'
import {
  getCambridgeSubjectGuidePosts,
  getIbSubjectGuidePosts,
  getIbIaGuidePosts,
} from '@/lib/seo/subject-guides'
import {
  BLOG_CATEGORY_LABELS,
  enrichPostsForIndex,
  isEditorialPost,
  sortPostsForIndex,
} from '@/lib/blog/meta'
import type { BlogCategory } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { BlogIndexJsonLd } from '@/components/seo/BlogPostJsonLd'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { ContentHubNav } from '@/components/content/ContentHubNav'
import { BoardSubjectFilter } from '@/components/content/BoardSubjectFilter'
import { FeaturedGuideBlock } from '@/components/content/FeaturedGuideBlock'
import { GuideArticleCard } from '@/components/content/GuideArticleCard'
import { TopicHubStrip } from '@/components/content/TopicHubStrip'
import { IbResultsSpotlight } from '@/components/seo/IbResultsSpotlight'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { getResultsDayPhase } from '@/lib/seo/results-day'
import { isIbResultsSeason } from '@/lib/seo/ib-results-season'
import { getFeaturedHubPost, getGuideGridPosts } from '@/lib/content/hub-display'

export const metadata = getPageMetadata('/blog', {
  keywords: [
    'Cambridge A-Level blog',
    'IB past papers guide',
    'IB markbands',
    'which A-Level subjects to take',
    'Cambridge exam leaks',
    'past paper guides',
  ],
})

function enrichAll(posts: ReturnType<typeof getBlogPosts>) {
  return enrichPostsForIndex(posts)
}

export default function BlogIndexPage() {
  const posts = getBlogPosts()
  const enriched = enrichAll(posts)
  const sorted = sortPostsForIndex(enriched)

  const editorial = sorted.filter((p) => isEditorialPost(p.slug, p.category))
  const cambridgeSubjectGuides = enrichAll(getCambridgeSubjectGuidePosts())
  const ibSubjectGuides = enrichAll(getIbSubjectGuidePosts())
  const ibIaGuides = enrichAll(getIbIaGuidePosts())
  const subjectGuideCount =
    cambridgeSubjectGuides.length + ibSubjectGuides.length + ibIaGuides.length
  const generalPosts = sorted.filter(
    (p) =>
      !isSubjectGuideSlug(p.slug) && !isEditorialPost(p.slug, p.category)
  )

  const featured = getFeaturedHubPost()
  const spotlight = editorial.find((p) => p.spotlight) ?? editorial[0]
  const featuredPost =
    featured && featured.slug !== spotlight?.slug ? featured : spotlight ?? featured
  const trending = editorial.filter((p) => p.slug !== featuredPost?.slug).slice(0, 4)
  const popularGuides = getGuideGridPosts(featuredPost?.slug, 6)

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
        label="Guides & blog"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]}
        title={
          <>
            What Cambridge students <em>are talking about now</em>
          </>
        }
        lead="Subject choice, exam-series prep, integrity after online leaks, AI rules, markbands, and mark-scheme-first revision — written for Cambridge A-Level, O-Level, and IB Diploma students, updated for 2026."
      >
        <ContentHubNav />
        <BoardSubjectFilter activeBoard={null} activeSubject={null} />
      </MarketingHero>

      {isIbResultsSeason() && (
        <MarketingSection className="!pt-0">
          <IbResultsSpotlight />
        </MarketingSection>
      )}

      {!isIbResultsSeason() && getResultsDayPhase() === 'pre-alevel' && (
        <MarketingSection className="!pt-0">
          <ResultsDayBanner />
        </MarketingSection>
      )}

      {featuredPost && (
        <MarketingSection className="!pt-0">
          <FeaturedGuideBlock post={featuredPost} />
        </MarketingSection>
      )}

      {trending.length > 0 && (
        <MarketingSection className="!pt-12">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
            <p className="ms-overline" style={{ marginBottom: 0 }}>
              Trending topics
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {trending.map((post) => (
              <BlogPostCard key={post.slug} post={post} variant="editorial" />
            ))}
          </div>
        </MarketingSection>
      )}

      {popularGuides.length > 0 && (
        <MarketingSection className="!pt-12">
          <p className="ms-overline">Popular guides</p>
          <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
            Scheme decoded &amp; exam technique
          </h2>
          <div className="ms-guide-grid" style={{ marginTop: 24 }}>
            {popularGuides.map((post) => (
              <GuideArticleCard key={post.slug} post={post} />
            ))}
          </div>
        </MarketingSection>
      )}

      <MarketingSection className="!pt-12">
        <div className="ms-blog-stats">
          <div className="ms-blog-stat">
            <span className="ms-blog-stat__value">{posts.length}+</span>
            <span className="ms-blog-stat__label">Articles & guides</span>
          </div>
          <div className="ms-blog-stat">
            <span className="ms-blog-stat__value">{editorial.length}</span>
            <span className="ms-blog-stat__label">2026 topic features</span>
          </div>
          <div className="ms-blog-stat">
            <span className="ms-blog-stat__value">{subjectGuideCount}</span>
            <span className="ms-blog-stat__label">Syllabus deep-dives</span>
          </div>
        </div>

        {generalPosts.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ms-overline">Marking &amp; revision</p>
                <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
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
            <div className="mt-8">
              <p className="ms-overline text-center">Browse every article by category</p>
              <nav
                className="mt-3 flex flex-wrap justify-center gap-2"
                aria-label="Browse blog categories"
              >
                {(Object.keys(BLOG_CATEGORY_LABELS) as BlogCategory[]).map((key) => (
                  <Link
                    key={key}
                    href={`/blog/category/${key}`}
                    className="ec-chip-ms ec-chip-ms--outline"
                  >
                    {BLOG_CATEGORY_LABELS[key]}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}
      </MarketingSection>

      {cambridgeSubjectGuides.length > 0 && (
        <MarketingSection className="!pt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ms-overline">By syllabus code</p>
              <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
                Cambridge subject past-paper guides
              </h2>
              <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 520 }}>
                9709, 9702, 9708, 4024, and every code we mark — structure, schemes, mistakes,
                revision plans.
              </p>
            </div>
            <Link
              href="/subjects"
              className="ec-btn-underline inline-flex items-center gap-1 text-sm"
            >
              <BookOpen className="h-4 w-4" />
              All Cambridge subjects
            </Link>
          </div>
          <div className="ms-guide-grid">
            {cambridgeSubjectGuides.map((post) => (
              <GuideArticleCard key={post.slug} post={post} />
            ))}
          </div>
        </MarketingSection>
      )}

      {(ibSubjectGuides.length > 0 || ibIaGuides.length > 0) && (
        <MarketingSection className="!pt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ms-overline">IB Diploma Programme</p>
              <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
                IB HL &amp; SL revision guides
              </h2>
              <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 520 }}>
                Markbands, past-paper structure, and Internal Assessment tips for every IB subject
                we cover — paired with free courses and topic practice.
              </p>
            </div>
            <Link
              href="/guides/ib"
              className="ec-btn-underline inline-flex items-center gap-1 text-sm"
            >
              <BookOpen className="h-4 w-4" />
              IB guide hub
            </Link>
          </div>
          {ibSubjectGuides.length > 0 ? (
            <div className="ms-guide-grid">
              {ibSubjectGuides.map((post) => (
                <GuideArticleCard key={post.slug} post={post} />
              ))}
            </div>
          ) : null}
          {ibIaGuides.length > 0 ? (
            <div style={{ marginTop: ibSubjectGuides.length ? 32 : 0 }}>
              <p className="ms-overline">Internal Assessment</p>
              <div className="ms-guide-grid">
                {ibIaGuides.map((post) => (
                  <GuideArticleCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          ) : null}
        </MarketingSection>
      )}

      <MarketingSection className="!pt-12">
        <TopicHubStrip />

        <div className="ms-blog-cta" style={{ marginTop: 40 }}>
          <p className="ms-overline">Keep learning</p>
          <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', marginTop: 8 }}>
            Guides for your subjects — in one place
          </h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 12, maxWidth: 520 }}>
            Pick your board and papers once — get tailored guides, community rooms, and exam
            updates. Marking and free courses unlock when you&apos;re ready.
          </p>
          <ul className="ms-blog-cta__perks" aria-label="Included with a free account">
            <li>Your subjects matched</li>
            <li>Community rooms</li>
            <li>7-day free trial on Scholar &amp; Max (via pricing)</li>
          </ul>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={buildSignUpHref('/blog')} className="ec-btn-primary min-h-[48px] px-8">
              Create free revision hub
            </Link>
            <Link href="/guides" className="ec-btn-ghost min-h-[48px] px-8">
              Browse all guides
            </Link>
          </div>
          <p className="ms-blog-cta__trust">No card required · Free forever tier</p>
        </div>
        <p className="ms-micro mt-8 text-center">
          <Link href="/guides" className="ec-btn-underline">
            Topic guides (hubs)
          </Link>
          {' · '}
          <a href="/feed.xml" className="ec-btn-underline">
            RSS feed
          </a>
          {' · '}
          <Link href="/how-it-works" className="ec-btn-underline">
            How it works
          </Link>
        </p>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}

