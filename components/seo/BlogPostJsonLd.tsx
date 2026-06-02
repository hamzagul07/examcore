import { SITE_NAME, SITE_URL } from '@/lib/site-config'
import type { BlogPost } from '@/lib/blog'

type Props = {
  post: BlogPost
}

/** Article + BreadcrumbList for blog rich results. */
export function BlogPostJsonLd({ post }: Props) {
  const url = `${SITE_URL}/blog/${post.slug}`
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${SITE_URL}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
      {
        '@type': 'BlogPosting',
        '@id': url,
        headline: post.title,
        description: post.description,
        datePublished: post.date || undefined,
        dateModified: post.date || undefined,
        url,
        mainEntityOfPage: url,
        inLanguage: 'en-GB',
        author: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
        keywords: post.keywords.join(', '),
        isAccessibleForFree: true,
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}

/** Blog index ItemList for crawlers. */
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
      'Cambridge A-Level and O-Level past paper tips, mark scheme guides, and revision strategies.',
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
