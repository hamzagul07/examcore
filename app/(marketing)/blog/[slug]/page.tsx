import { notFound } from 'next/navigation'
import { createBlogPostMetadata } from '@/lib/seo/metadata'
import { getAllBlogSlugs, getBlogPost, getRelatedPosts } from '@/lib/blog'
import { enrichPostMeta, extractHeadings } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { BlogPillarLinks } from '@/components/seo/BlogPillarLinks'
import { BlogPostCta } from '@/components/seo/BlogPostCta'
import { BlogPostGraphJsonLd } from '@/components/seo/BlogPostGraphJsonLd'
import { BlogArticleHero } from '@/components/blog/BlogArticleHero'
import { BlogAuthorByline } from '@/components/blog/BlogAuthorByline'
import { BlogClusterNav } from '@/components/blog/BlogClusterNav'
import { BlogQuickAnswer } from '@/components/blog/BlogQuickAnswer'
import { BlogSourcesBlock } from '@/components/blog/BlogSourcesBlock'
import { BlogSerpSnippets } from '@/components/blog/BlogSerpSnippets'
import { BlogTaskCompleteCta } from '@/components/blog/BlogTaskCompleteCta'
import { BlogReadingProgress } from '@/components/blog/BlogReadingProgress'
import { BlogChunkedArticle } from '@/components/blog/BlogChunkedArticle'
import { BlogFollowUpChain } from '@/components/blog/BlogFollowUpChain'
import { BlogConversationalQueries } from '@/components/blog/BlogConversationalQueries'
import { BlogInContentLinks } from '@/components/blog/BlogInContentLinks'
import { BlogInformationGain } from '@/components/blog/BlogInformationGain'
import { BlogTableOfContents } from '@/components/blog/BlogTableOfContents'
import { BlogRelatedGrid } from '@/components/blog/BlogRelatedGrid'

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
  const related = getRelatedPosts(slug, 3)

  return (
    <MarketingPageShell narrow>
      <BlogPostGraphJsonLd post={post} content={post.content} />
      <BlogReadingProgress />
      <article className="py-12 sm:py-16">
        <BlogArticleHero post={enriched} />
        <BlogClusterNav slug={slug} />
        <BlogQuickAnswer
          title={post.title}
          description={post.description}
          content={post.content}
          date={post.updated ?? post.date}
        />
        <BlogAuthorByline authorId={post.author} />
        <BlogInformationGain
          slug={slug}
          content={post.content}
          informationGain={post.informationGain}
        />
        <BlogConversationalQueries slug={slug} />
        <BlogInContentLinks slug={slug} />

        <div className="ec-blog-layout mt-10">
          <BlogTableOfContents headings={headings} />
          <div className="ec-blog-prose ec-fanout-prose min-w-0">
            <BlogChunkedArticle content={post.content} slug={slug} />
          </div>
        </div>

        <BlogFollowUpChain slug={slug} />
        <BlogSerpSnippets content={post.content} />
        <BlogTaskCompleteCta />
        <BlogSourcesBlock />
        <BlogPostCta variant={isSubjectGuideSlug(slug) ? 'subject' : 'default'} />
        <BlogPillarLinks showSubjects={!isSubjectGuideSlug(slug)} />
        <BlogRelatedGrid posts={related} />
      </article>
    </MarketingPageShell>
  )
}
