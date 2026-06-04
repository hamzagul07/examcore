import { SITE_NAME, SITE_URL } from '@/lib/site-config'
import type { BlogPost } from '@/lib/blog'
import { getAuthor } from '@/lib/seo/authors'
import { getClusterForSlug } from '@/lib/seo/clusters'
import {
  extractComparisonItems,
  extractFaqFromMarkdown,
  extractHowToSteps,
} from '@/lib/seo/content-extract'
import { getPostSeoMeta } from '@/lib/seo/post-seo'
import type { JsonLd } from '@/lib/seo/structured-data'
import {
  brandNode,
  breadcrumbList,
  organizationNode,
  personNode,
  softwareApplicationNode,
  websiteNode,
} from '@/lib/seo/structured-data'

const ORG_ID = `${SITE_URL}/#organization`
const BRAND_ID = `${SITE_URL}/#brand`
const WEBSITE_ID = `${SITE_URL}/#website`
const APP_ID = `${SITE_URL}/#app`

/** Interconnected @graph for global layout (entity + retrieval). */
export function buildSiteGraph(): JsonLd[] {
  const author = getAuthor()
  const person = personNode(author)
  const org = organizationNode()
  const brand = brandNode()
  const site = websiteNode()
  const app = {
    ...softwareApplicationNode(),
    '@id': APP_ID,
    brand: { '@id': BRAND_ID },
    provider: { '@id': ORG_ID },
  }

  return [
    { ...org, '@id': ORG_ID },
    { ...brand, '@id': BRAND_ID },
    { ...site, '@id': WEBSITE_ID, publisher: { '@id': ORG_ID } },
    { ...person, '@id': `${author.url}#${author.id}` },
    app,
  ]
}

/** Full page graph: WebPage ↔ Article ↔ Person ↔ Organization ↔ Breadcrumb. */
export function buildBlogPostGraph(post: BlogPost, content: string): JsonLd[] {
  const url = `${SITE_URL}/blog/${post.slug}`
  const author = getAuthor(post.author)
  const personId = `${author.url}#${author.id}`
  const webpageId = `${url}#webpage`
  const articleId = `${url}#article`
  const seo = getPostSeoMeta(post.slug, post.category)
  const faq = extractFaqFromMarkdown(content)
  const cluster = getClusterForSlug(post.slug)

  const graph: JsonLd[] = [
    { ...organizationNode(), '@id': ORG_ID },
    { ...brandNode(), '@id': BRAND_ID },
    { ...websiteNode(), '@id': WEBSITE_ID },
    { ...personNode(author), '@id': personId },
    {
      '@type': 'WebPage',
      '@id': webpageId,
      url,
      name: post.title,
      description: post.description,
      inLanguage: 'en-GB',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': `${SITE_URL}${cluster.path}#collection` },
      primaryImageOfPage: `${SITE_URL}/blog/opengraph-image`,
    },
    {
      '@type': 'BlogPosting',
      '@id': articleId,
      headline: post.title,
      description: post.description,
      datePublished: post.date || undefined,
      dateModified: post.updated || post.date || undefined,
      url,
      mainEntityOfPage: { '@id': webpageId },
      author: { '@id': personId },
      publisher: { '@id': ORG_ID },
      isPartOf: { '@id': WEBSITE_ID },
      keywords: post.keywords.join(', '),
      inLanguage: 'en-GB',
      articleSection: post.category ?? cluster.title,
    },
    {
      ...breadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.title, path: `/blog/${post.slug}` },
      ]),
      '@id': `${url}#breadcrumb`,
    },
  ]

  if (faq.length >= 2) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      isPartOf: { '@id': articleId },
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    })
  }

  if (seo.format === 'howto') {
    const steps = extractHowToSteps(content)
    if (steps.length >= 3) {
      graph.push({
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: post.title,
        description: post.description,
        isPartOf: { '@id': articleId },
        step: steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      })
    }
  }

  if (seo.format === 'comparison') {
    const items = extractComparisonItems(content)
    if (items.length >= 2) {
      graph.push({
        '@type': 'ItemList',
        '@id': `${url}#itemlist`,
        name: post.title,
        isPartOf: { '@id': articleId },
        itemListElement: items.map((name, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name,
        })),
      })
    }
  }

  return graph
}

export function wrapGraph(nodes: JsonLd[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((n) => ({ ...n, '@context': undefined })),
  }
}
