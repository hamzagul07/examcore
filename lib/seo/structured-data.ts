import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from '@/lib/site-config'
import type { SiteAuthor } from '@/lib/seo/authors'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'
import { BRAND_ENTITY, getBrandSameAs, getFounderSameAs } from '@/lib/seo/entity'

export type JsonLd = Record<string, unknown>

export function jsonLdScript(data: JsonLd | JsonLd[]) {
  return JSON.stringify(data)
}

export function organizationNode(): JsonLd {
  const sameAs = getBrandSameAs()

  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND_ENTITY.name,
    legalName: BRAND_ENTITY.legalName,
    url: BRAND_ENTITY.url,
    email: BRAND_ENTITY.email,
    description: BRAND_ENTITY.description,
    areaServed: BRAND_ENTITY.areaServed,
    knowsAbout: [...BRAND_ENTITY.knowsAbout],
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/apple-icon`,
      width: 180,
      height: 180,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      availableLanguage: ['en'],
    },
    founder: {
      '@type': 'Person',
      '@id': `${SITE_URL}/about#${DEFAULT_BLOG_AUTHOR.id}`,
      name: DEFAULT_BLOG_AUTHOR.name,
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}

export function brandNode(): JsonLd {
  return {
    '@type': 'Brand',
    '@id': `${SITE_URL}/#brand`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
  }
}

export function personNode(author: SiteAuthor): JsonLd {
  const founderSameAs = getFounderSameAs()
  return {
    '@type': 'Person',
    '@id': `${author.url}#${author.id}`,
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: author.url,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    knowsAbout: [
      'Cambridge International examinations',
      'Past paper marking',
      'Mark schemes',
    ],
    ...(author.credentials?.length
      ? {
          hasCredential: author.credentials.map((c) => ({
            '@type': 'EducationalOccupationalCredential',
            name: c,
          })),
        }
      : {}),
    ...(founderSameAs.length > 0 ? { sameAs: founderSameAs } : {}),
  }
}

export function websiteNode(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'en-GB',
    publisher: { '@id': `${SITE_URL}/#organization` },
    about: { '@id': `${SITE_URL}/#brand` },
    hasPart: [
      { '@type': 'WebPage', url: `${SITE_URL}/mark`, name: 'Mark a Cambridge past paper' },
      { '@type': 'WebPage', url: `${SITE_URL}/subjects`, name: 'Cambridge subjects' },
      { '@type': 'WebPage', url: `${SITE_URL}/courses`, name: 'Free Cambridge courses' },
      { '@type': 'WebPage', url: `${SITE_URL}/blog`, name: 'Revision guides & exam tips' },
    ],
  }
}

export function learningResourceNode(options: {
  name: string
  description: string
  url: string
  syllabusCode: string
  topics?: string[]
  level?: string
}): JsonLd {
  return {
    '@type': 'LearningResource',
    name: options.name,
    description: options.description,
    url: options.url,
    inLanguage: 'en-GB',
    educationalLevel: options.level ?? 'secondary education',
    teaches: options.topics?.length
      ? options.topics
      : `Cambridge syllabus ${options.syllabusCode}`,
    about: options.topics?.length
      ? options.topics.map((t) => ({ '@type': 'Thing', name: t }))
      : { '@type': 'Thing', name: `Cambridge ${options.syllabusCode}` },
    provider: { '@id': `${SITE_URL}/#organization` },
  }
}

export function itemListNode(options: {
  name: string
  description?: string
  items: { name: string; url?: string; description?: string }[]
}): JsonLd {
  return {
    '@type': 'ItemList',
    name: options.name,
    ...(options.description ? { description: options.description } : {}),
    numberOfItems: options.items.length,
    itemListElement: options.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { url: item.url } : {}),
      ...(item.description ? { description: item.description } : {}),
    })),
  }
}

export function breadcrumbList(
  items: { name: string; path: string }[]
): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function webPageNode(options: {
  path: string
  name: string
  description: string
}): JsonLd {
  const url = `${SITE_URL}${options.path}`
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: options.name,
    description: options.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: 'en-GB',
  }
}

export function faqPageNode(
  items: { q: string; a: string }[],
  opts: { speakableSelectors?: string[] } = {}
): JsonLd {
  return {
    '@type': 'FAQPage',
    // Speakable points voice/AI answer engines at the on-page Q&A. Only set
    // when the caller's DOM actually exposes the given selectors.
    ...(opts.speakableSelectors?.length
      ? {
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: opts.speakableSelectors,
          },
        }
      : {}),
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

export function howToNode(options: {
  name: string
  description: string
  url: string
  steps: { name: string; text: string }[]
}): JsonLd {
  return {
    '@type': 'HowTo',
    name: options.name,
    description: options.description,
    url: options.url,
    inLanguage: 'en-GB',
    step: options.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

export function softwareApplicationNode(): JsonLd {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#app`,
    name: SITE_NAME,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/mark`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
  }
}

export function datasetNode(options: {
  name: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  creatorName: string
  variables: { name: string; value: number | string; unitText?: string }[]
  license?: string
}): JsonLd {
  return {
    '@type': 'Dataset',
    '@id': `${options.url}#dataset`,
    name: options.name,
    description: options.description,
    url: options.url,
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    inLanguage: 'en-GB',
    license: options.license,
    creator: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: options.creatorName,
    },
    variableMeasured: options.variables.map((v) => ({
      '@type': 'PropertyValue',
      name: v.name,
      value: v.value,
      ...(v.unitText ? { unitText: v.unitText } : {}),
    })),
    isAccessibleForFree: true,
  }
}

export function collectionPageNode(options: {
  path: string
  name: string
  description: string
  hasPart: { name: string; url: string }[]
}): JsonLd {
  const url = `${SITE_URL}${options.path}`
  return {
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: options.name,
    description: options.description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: options.hasPart.map((p) => ({
      '@type': 'Article',
      name: p.name,
      url: p.url,
    })),
  }
}
