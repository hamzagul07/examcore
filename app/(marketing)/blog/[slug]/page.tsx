import { notFound } from 'next/navigation'
import { createBlogPostMetadata } from '@/lib/seo/metadata'
import { getAllBlogSlugs, getBlogPost, getRelatedPosts } from '@/lib/blog'
import { enrichPostMeta, extractHeadings } from '@/lib/blog/meta'
import { getClusterForSlug } from '@/lib/seo/clusters'
import {
  isGradeBoundaryGuideSlug,
  isIbGuideSlug,
  isIbIaGuideSlug,
  isSubjectGuideSlug,
  subjectCodeFromBlogSlug,
} from '@/lib/seo/subject-guides'
import { BlogFollowUpChain } from '@/components/blog/BlogFollowUpChain'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { BlogPostCta } from '@/components/seo/BlogPostCta'
import { BlogPostGraphJsonLd } from '@/components/seo/BlogPostGraphJsonLd'
import { BlogArticleHero } from '@/components/blog/BlogArticleHero'
import { BlogAuthorByline } from '@/components/blog/BlogAuthorByline'
import { BlogQuickAnswer } from '@/components/blog/BlogQuickAnswer'
import { BlogReadingProgress } from '@/components/blog/BlogReadingProgress'
import { BlogChunkedArticle } from '@/components/blog/BlogChunkedArticle'
import { BlogTableOfContents } from '@/components/blog/BlogTableOfContents'
import { BlogRelatedGrid } from '@/components/blog/BlogRelatedGrid'
import { BlogBreadcrumbs } from '@/components/blog/BlogBreadcrumbs'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { getSyllabusSubjectName } from '@/lib/syllabi'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return createBlogPostMetadata({
    ...post,
    updated: post.updated,
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const enriched = enrichPostMeta(post, post.content)
  const headings = extractHeadings(post.content)
  const related = getRelatedPosts(slug, isIbGuideSlug(slug) ? 5 : 3)
  const cluster = getClusterForSlug(slug)
  const subjectCode = subjectCodeFromBlogSlug(slug)
  const showResultsDayBanner = isGradeBoundaryGuideSlug(slug)
  const ctaVariant = showResultsDayBanner
    ? 'grade-boundaries'
    : isIbIaGuideSlug(slug)
      ? 'ib-ia'
      : isIbGuideSlug(slug)
        ? 'ib'
        : isSubjectGuideSlug(slug)
          ? 'subject'
          : 'default'

  const subjectName = subjectCode ? getSyllabusSubjectName(subjectCode) : null

  return (
    <MarketingPageShell narrow>
      <BlogPostGraphJsonLd post={post} content={post.content} />
      <BlogReadingProgress />
      <article className="ms-pg py-12 sm:py-16">
        <BlogBreadcrumbs slug={slug} title={post.title} />
        <BlogArticleHero post={enriched} />
        <BlogQuickAnswer
          title={post.title}
          description={post.description}
          content={post.content}
          date={post.updated ?? post.date}
        />
        {showResultsDayBanner ? (
          <ResultsDayBanner subjectCode={subjectCode} className="mb-8" />
        ) : null}
        <BlogAuthorByline authorId={post.author} />

        <div
          id="blog-article-body"
          className="ms-blog-layout ec-blog-prose ec-fanout-prose mt-10 min-w-0 scroll-mt-24"
        >
          <BlogTableOfContents headings={headings} />
          <div className="min-w-0">
            <BlogChunkedArticle
              content={post.content}
              slug={slug}
              variant={ctaVariant}
              subjectCode={subjectCode}
            />
          </div>
        </div>

        <BlogFollowUpChain slug={slug} />
        <BlogPostCta
          variant={ctaVariant}
          subjectCode={subjectCode}
          subjectName={subjectName}
          slug={slug}
        />
        <BlogRelatedGrid posts={related} clusterId={cluster.id} />
      </article>
    </MarketingPageShell>
  )
}
