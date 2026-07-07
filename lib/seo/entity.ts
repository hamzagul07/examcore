import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'

// Live, verified brand profiles (public URLs). Kept as code defaults so they ship
// in Organization.sameAs without a deploy env var; the env vars still override.
const DEFAULT_BRAND_LINKEDIN = 'https://www.linkedin.com/company/markscheme/'
const DEFAULT_BRAND_TWITTER = 'https://twitter.com/MarkSchemeApp'
const DEFAULT_BRAND_YOUTUBE = 'https://www.youtube.com/@MarkSchemeApp'
const DEFAULT_BRAND_INSTAGRAM = 'https://www.instagram.com/markscheme.app'
const DEFAULT_BRAND_TIKTOK = 'https://www.tiktok.com/@markscheme'
const DEFAULT_BRAND_CRUNCHBASE = 'https://www.crunchbase.com/organization/markscheme'
const DEFAULT_WIKIDATA_ENTITY = 'https://www.wikidata.org/wiki/Q140455387'
const DEFAULT_FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/hamza-gul-hassan-0568b7367/'

/** Wikidata Q-id for cross-referencing in press copy and schema identifiers. */
export const WIKIDATA_QID = 'Q140455387'

export function getWikidataEntityUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_WIKIDATA_ENTITY_URL?.trim() || DEFAULT_WIKIDATA_ENTITY
  return url || undefined
}

/** Authoritative profiles for Knowledge Graph / entity confidence. */
export function getBrandSameAs(): string[] {
  return [
    getWikidataEntityUrl(),
    process.env.NEXT_PUBLIC_TWITTER_URL ?? DEFAULT_BRAND_TWITTER,
    process.env.NEXT_PUBLIC_LINKEDIN_URL ?? DEFAULT_BRAND_LINKEDIN,
    process.env.NEXT_PUBLIC_CRUNCHBASE_URL ?? DEFAULT_BRAND_CRUNCHBASE,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? DEFAULT_BRAND_INSTAGRAM,
    process.env.NEXT_PUBLIC_TIKTOK_URL ?? DEFAULT_BRAND_TIKTOK,
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
    'MarkScheme marks Cambridge International (A-Level, O-Level, IGCSE) and IB Diploma past papers from handwriting using real mark schemes and markbands — plus free syllabus courses and Exam Room student communities.',
  founder: DEFAULT_BLOG_AUTHOR.name,
  areaServed: 'Worldwide',
  slogan: 'Second-pass marking against real schemes',
  knowsAbout: [
    'Cambridge International Examinations',
    'International Baccalaureate Diploma Programme',
    'A-Level past papers',
    'O-Level past papers',
    'IGCSE past papers',
    'IB past papers',
    'Mark schemes',
    'IB markbands',
    'Exam marking',
    'Handwritten answer marking',
    'Free online courses',
    'Past paper revision',
    'Exam preparation',
  ],
} as const
