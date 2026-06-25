import { SITE_NAME, SITE_URL } from '@/lib/site-config'
import type { BlogPost } from '@/lib/blog'
import { getAuthor } from '@/lib/seo/authors'
import {
  extractComparisonItems,
  extractFaqFromMarkdown,
  extractHowToSteps,
} from '@/lib/seo/content-extract'
import { getPostSeoMeta } from '@/lib/seo/post-seo'
import {
  faqPageNode,
  howToNode,
  itemListNode,
  personNode,
} from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/JsonLd'

type Props = {
  post: BlogPost
  content?: string
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Article + BreadcrumbList + FAQ/HowTo/ItemList + Author (E-E-A-T). */
export function BlogPostJsonLd({ post, content = '' }: Props) {
  const url = `${SITE_URL}/blog/${post.slug}`
  const words = content ? wordCount(content) : undefined
  const author = getAuthor(post.author)
  const seo = getPostSeoMeta(post.slug, post.category)
  const faq = extractFaqFromMarkdown(content)
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
    personNode(author),
    {
      '@type': 'BlogPosting',
      '@id': url,
      headline: post.title,
      description: post.description,
      datePublished: post.date || undefined,
      dateModified: post.updated || post.date || undefined,
      url,
      mainEntityOfPage: url,
      inLanguage: 'en-GB',
      author: { '@id': `${author.url}#${author.id}` },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      keywords: post.keywords.join(', '),
      isAccessibleForFree: true,
      ...(words && words > 200 ? { wordCount: words } : {}),
      articleSection: post.category ?? 'Education',
    },
  ]

  if (faq.length >= 2) {
    graph.push(faqPageNode(faq))
  }

  if (seo.format === 'howto') {
    const steps = extractHowToSteps(content)
    if (steps.length >= 3) {
      graph.push(
        howToNode({
          name: post.title,
          description: post.description,
          url,
          steps,
        })
      )
    }
  }

  if (seo.format === 'comparison') {
    const items = extractComparisonItems(content)
    if (items.length >= 2) {
      graph.push(
        itemListNode({
          name: post.title,
          items: items.map((name) => ({ name })),
        })
      )
    }
  }

  return <JsonLd data={graph} />
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
