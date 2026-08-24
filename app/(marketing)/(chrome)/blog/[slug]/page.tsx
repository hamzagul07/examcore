import { notFound } from 'next/navigation'
import { createBlogPostMetadata } from '@/lib/seo/metadata'
import { getAllBlogSlugs, getBlogPost, getRelatedPosts } from '@/lib/blog'
import { enrichPostMeta, extractHeadings } from '@/lib/blog/meta'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { markBoardFromBlogSlug } from '@/lib/seo/blog-mark-href'
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
import { BlogMarkExample } from '@/components/blog/BlogMarkExample'
import { BlogPostGraphJsonLd } from '@/components/seo/BlogPostGraphJsonLd'
import { BlogArticleHero } from '@/components/blog/BlogArticleHero'
import { BlogAuthorByline } from '@/components/blog/BlogAuthorByline'
import { BlogQuickAnswer } from '@/components/blog/BlogQuickAnswer'
import { BlogSerpSnippets } from '@/components/blog/BlogSerpSnippets'
import { BlogConversationalQueries } from '@/components/blog/BlogConversationalQueries'
import { BlogInformationGain } from '@/components/blog/BlogInformationGain'
import { BlogInContentLinks } from '@/components/blog/BlogInContentLinks'
import { BlogSourcesBlock } from '@/components/blog/BlogSourcesBlock'
import { BlogReadingProgress } from '@/components/blog/BlogReadingProgress'
import { BlogChunkedArticle } from '@/components/blog/BlogChunkedArticle'
import { BlogTableOfContents } from '@/components/blog/BlogTableOfContents'
import { BlogRelatedGrid } from '@/components/blog/BlogRelatedGrid'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { BlogBreadcrumbs } from '@/components/blog/BlogBreadcrumbs'
import { BlogShareButtons } from '@/components/blog/BlogShareButtons'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { ResultsThreadCta } from '@/components/community/ResultsThreadCta'
import { IbThreadCta } from '@/components/community/IbThreadCta'

/**
 * Both halves of the IA content: 15 `-ia-guide` posts and 14 `-ia-ideas` ones.
 * `isIbIaGuideSlug` covers only the first, and is used elsewhere to build the
 * guides index, so it is left alone rather than widened underneath its other
 * caller.
 */
function isIbIaPage(slug: string): boolean {
  return slug.startsWith('ib-') && (slug.endsWith('-ia-guide') || slug.endsWith('-ia-ideas'))
}
import { getSyllabusSubjectName } from '@/lib/syllabi'
import { SITE_URL } from '@/lib/site-config'

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
    <MarketingPageShell className="ms-blog-post-shell">
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
        <BlogSerpSnippets content={post.content} />
        <BlogConversationalQueries slug={slug} />
        <BlogAuthorByline authorId={post.author} />
        <BlogInformationGain
          slug={slug}
          content={post.content}
          informationGain={post.informationGain}
        />

        <div
          id="blog-article-body"
          className="ms-blog-layout ec-blog-prose ec-fanout-prose mt-10 min-w-0 scroll-mt-24"
        >
          <BlogTableOfContents headings={headings} />
          <div className="ec-reading-column min-w-0">
            <BlogChunkedArticle content={post.content} slug={slug} />
            <BlogInContentLinks slug={slug} />
          </div>
        </div>

        <BlogShareButtons url={`${SITE_URL}/blog/${slug}`} title={post.title} />

        {/* After the article, not before it: the ask converts once the reader
            has the answer they came for. */}
        {showResultsDayBanner ? (
          <ResultsThreadCta source="blog" subjectCode={subjectCode} className="mt-8" />
        ) : null}

        {/* Same placement logic as the results banner: after the guide, once the
            reader has what they came for. An IA guide ends exactly where the
            useful question starts. */}
        {!showResultsDayBanner && isIbIaPage(slug) && post.subject ? (
          <IbThreadCta subject={post.subject} source="blog-ib-ia" className="mt-8" />
        ) : null}

        <BlogSourcesBlock slug={slug} />
        <BlogFollowUpChain slug={slug} />
        <BlogMarkExample slug={slug} board={markBoardFromBlogSlug(slug)} />
        <BlogPostCta
          variant={ctaVariant}
          subjectCode={subjectCode}
          subjectName={subjectName}
          slug={slug}
        />

        {/* The November list, built where the readers actually are.

            This capture used to live only on results-2026/* and two tools pages
            — traffic that peaked on results day and is now falling — while the
            blog carries ~40% of sessions and never saw it. Mock season is when
            marking is used and when this list converts, so every week it was
            absent is capture that cannot be recovered later.

            Deliberately AFTER BlogPostCta, not instead of it. Marking a question
            is still the better ask for a reader who is revising today; this is
            the fallback for the one who isn't, which is most of a blog audience
            in August. Suppressed where a thread CTA already ran, so results and
            IA guides don't stack three asks in a row. */}
        {!showResultsDayBanner && !(isIbIaPage(slug) && post.subject) ? (
          <MockPackEmailCapture
            source="blog"
            syllabusCode={subjectCode}
            className="mt-8"
          />
        ) : null}

        <BlogRelatedGrid posts={related} clusterId={cluster.id} />
      </article>
    </MarketingPageShell>
  )
}
