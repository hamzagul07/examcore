import type { Metadata } from 'next'
import { PAGE_KEYWORDS, SEO_KEYWORDS } from '@/lib/seo/keywords'
import { keywordsForSubjectPath } from '@/lib/seo/subject-seo'
import { keywordsForIbPath } from '@/lib/seo/ib-seo'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

type PageMetadataOptions = {
  title: string
  description: string
  path: string
  /** Canonical URL path when different from `path` (e.g. paper-scoped lesson aliases). */
  canonicalPath?: string
  index?: boolean
  keywords?: string[]
  ogType?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  /** Relative OG image under metadataBase, e.g. /opengraph-image */
  ogImagePath?: string
}

function mergeKeywords(path: string, extra?: string[]): string[] {
  const page =
    PAGE_KEYWORDS[path] ??
    keywordsForSubjectPath(path) ??
    keywordsForIbPath(path) ??
    []
  const set = new Set<string>([...SEO_KEYWORDS, ...page, ...(extra ?? [])])
  return [...set]
}

function buildVerification(): Metadata['verification'] | undefined {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim()
  const bing = process.env.BING_SITE_VERIFICATION?.trim()
  const yandex = process.env.YANDEX_VERIFICATION?.trim()
  if (!google && !bing && !yandex) return undefined
  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
    ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
  }
}

function ogImages(path: string, ogImagePath: string | undefined, alt: string) {
  const imagePath = ogImagePath ?? (path === '/' ? '/opengraph-image' : path.startsWith('/blog') ? '/blog/opengraph-image' : '/opengraph-image')
  return [
    {
      url: imagePath,
      width: 1200,
      height: 630,
      alt,
    },
  ]
}

export function createPageMetadata({
  title,
  description,
  path,
  canonicalPath,
  index = true,
  keywords: extraKeywords,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  ogImagePath,
}: PageMetadataOptions): Metadata {
  const rawTitle = title.includes(SITE_NAME)
    ? title.replace(new RegExp(`\\s*—\\s*${SITE_NAME}\\s*$`), '')
    : title
  const pageTitle = formatSerpTitle(rawTitle, true)
  const metaDescription = formatMetaDescription(description)
  const url = `${SITE_URL}${path}`
  const canonicalUrl = `${SITE_URL}${canonicalPath ?? path}`
  const keywords = mergeKeywords(path, extraKeywords)
  const ogTitle = pageTitle.includes(SITE_NAME)
    ? pageTitle
    : `${pageTitle} — ${SITE_NAME}`

  return {
    title: pageTitle,
    description: metaDescription,
    keywords,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'education',
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: ogTitle,
      description: metaDescription,
      url,
      siteName: SITE_NAME,
      type: ogType,
      locale: 'en_GB',
      images: ogImages(path, ogImagePath, ogTitle),
      ...(ogType === 'article' && publishedTime
        ? {
            publishedTime,
            modifiedTime: modifiedTime ?? publishedTime,
            authors: [SITE_NAME],
            section: 'Education',
            tags: extraKeywords?.slice(0, 5),
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: metaDescription,
      images: ogImages(path, ogImagePath, ogTitle).map((i) => i.url),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { 'en-GB': canonicalUrl },
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false },
    verification: buildVerification(),
  }
}

export function createBlogPostMetadata(post: {
  title: string
  description: string
  slug: string
  date: string
  keywords: string[]
  updated?: string
}): Metadata {
  const published = post.date ? `${post.date}T08:00:00.000Z` : undefined
  const modified = post.updated
    ? `${post.updated}T08:00:00.000Z`
    : published
  const shortTitle = post.title.replace(/\s*—\s*MarkScheme\s*$/i, '').trim()
  return createPageMetadata({
    title: shortTitle,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    ogType: 'article',
    publishedTime: published,
    modifiedTime: modified,
    ogImagePath: '/blog/opengraph-image',
  })
}

/** Shared favicon + apple touch icon for root metadata. */
export const SITE_ICONS: Metadata['icons'] = {
  icon: [
    { url: '/icon', type: 'image/png', sizes: '32x32' },
    { url: '/favicon.png', type: 'image/png', sizes: '192x192' },
    { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
  ],
  apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
  shortcut: ['/icon'],
}
