import { getAuthor } from '@/lib/seo/authors'
import type { JsonLd } from '@/lib/seo/structured-data'
import {
  brandNode,
  organizationNode,
  personNode,
  softwareApplicationNode,
  websiteNode,
} from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'

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

export function wrapGraph(nodes: JsonLd[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((n) => ({ ...n, '@context': undefined })),
  }
}
