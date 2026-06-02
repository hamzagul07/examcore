import type { Metadata } from 'next'
import { PAGE_KEYWORDS, SEO_KEYWORDS } from '@/lib/seo/keywords'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

type PageMetadataOptions = {
  title: string
  description: string
  path: string
  /** When false, adds noindex (private/authenticated surfaces). Default true. */
  index?: boolean
  /** Extra keywords for this URL (merged with global list). */
  keywords?: string[]
  /** Use `article` for blog posts (better OG type). */
  ogType?: 'website' | 'article'
  /** ISO date for articles. */
  publishedTime?: string
}

function mergeKeywords(path: string, extra?: string[]): string[] {
  const page = PAGE_KEYWORDS[path] ?? []
  const set = new Set<string>([...SEO_KEYWORDS, ...page, ...(extra ?? [])])
  return [...set]
}

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  keywords: extraKeywords,
  ogType = 'website',
  publishedTime,
}: PageMetadataOptions): Metadata {
  const pageTitle = title.includes(SITE_NAME)
    ? title.replace(new RegExp(`\\s*—\\s*${SITE_NAME}\\s*$`), '')
    : title
  const url = `${SITE_URL}${path}`
  const keywords = mergeKeywords(path, extraKeywords)
  const ogTitle = pageTitle.includes(SITE_NAME)
    ? pageTitle
    : `${pageTitle} — ${SITE_NAME}`

  return {
    title: pageTitle,
    description,
    keywords,
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: ogType,
      locale: 'en_GB',
      ...(ogType === 'article' && publishedTime
        ? { publishedTime }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
    alternates: {
      canonical: url,
    },
    ...(index
      ? {}
      : { robots: { index: false, follow: false } }),
  }
}

export function createBlogPostMetadata(post: {
  title: string
  description: string
  slug: string
  date: string
  keywords: string[]
}): Metadata {
  return createPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    ogType: 'article',
    publishedTime: post.date ? `${post.date}T00:00:00.000Z` : undefined,
  })
}
