import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'

// Live, verified brand profiles (public URLs). Kept as code defaults so they ship
// in Organization.sameAs without a deploy env var; the env vars still override.
const DEFAULT_BRAND_LINKEDIN = 'https://www.linkedin.com/company/markscheme/'
const DEFAULT_BRAND_TWITTER = 'https://twitter.com/MarkSchemeApp'
const DEFAULT_BRAND_YOUTUBE = 'https://www.youtube.com/@MarkSchemeApp'
const DEFAULT_BRAND_CRUNCHBASE = 'https://www.crunchbase.com/organization/markscheme'
const DEFAULT_FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/hamza-gul-hassan-0568b7367/'

/** Authoritative profiles for Knowledge Graph / entity confidence. */
export function getBrandSameAs(): string[] {
  return [
    process.env.NEXT_PUBLIC_WIKIDATA_ENTITY_URL,
    process.env.NEXT_PUBLIC_TWITTER_URL ?? DEFAULT_BRAND_TWITTER,
    process.env.NEXT_PUBLIC_LINKEDIN_URL ?? DEFAULT_BRAND_LINKEDIN,
    process.env.NEXT_PUBLIC_CRUNCHBASE_URL ?? DEFAULT_BRAND_CRUNCHBASE,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_YOUTUBE_URL ?? DEFAULT_BRAND_YOUTUBE,
    process.env.NEXT_PUBLIC_GITHUB_URL,
  ].filter((u): u is string => Boolean(u?.trim()))
}

export function getFounderSameAs(): string[] {
  return [
    process.env.NEXT_PUBLIC_FOUNDER_LINKEDIN_URL ?? DEFAULT_FOUNDER_LINKEDIN,
    process.env.NEXT_PUBLIC_FOUNDER_TWITTER_URL,
  ].filter((u): u is string => Boolean(u?.trim()))
}

/** Consistent NAP-style brand record (Name, Address, Phone → web/email for SaaS). */
export const BRAND_ENTITY = {
  name: SITE_NAME,
  legalName: SITE_NAME,
  url: SITE_URL,
  email: CONTACT_EMAIL,
  description:
    'Cambridge International A-Level and O-Level past-paper marking against real mark schemes, plus IB Diploma (IBDP) past papers and mark-scheme guidance.',
  founder: DEFAULT_BLOG_AUTHOR.name,
  areaServed: 'Worldwide',
  knowsAbout: [
    'Cambridge International Examinations',
    'International Baccalaureate Diploma Programme',
    'A-Level past papers',
    'O-Level past papers',
    'IB past papers',
    'Mark schemes',
    'Exam marking',
  ],
} as const
