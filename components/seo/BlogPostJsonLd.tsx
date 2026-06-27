import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/**
 * Blog index ItemList for crawlers.
 *
 * NOTE: per-post Article/FAQ/HowTo schema lives in lib/seo/graph.ts
 * (rendered via BlogPostGraphJsonLd). This file intentionally only
 * holds the index-level Blog ItemList to avoid two sources of truth.
 */
export function BlogIndexJsonLd({
  posts,
}: {
  posts: { slug: string; title: string; date: string }[]
}) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog`,
    name: `${SITE_NAME} Blog`,
    description:
      'Cambridge A-Level, O-Level and IB Diploma past paper tips, mark scheme guides, markbands, and revision strategies.',
    url: `${SITE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.date || undefined,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
