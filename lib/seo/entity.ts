import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'

/** Authoritative profiles for Knowledge Graph / entity confidence. */
export function getBrandSameAs(): string[] {
  return [
    process.env.NEXT_PUBLIC_WIKIDATA_ENTITY_URL,
    process.env.NEXT_PUBLIC_TWITTER_URL,
    process.env.NEXT_PUBLIC_LINKEDIN_URL,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_YOUTUBE_URL,
    process.env.NEXT_PUBLIC_GITHUB_URL,
  ].filter((u): u is string => Boolean(u?.trim()))
}

export function getFounderSameAs(): string[] {
  return [
    process.env.NEXT_PUBLIC_FOUNDER_LINKEDIN_URL,
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
    'Cambridge International A-Level and O-Level past-paper marking against real mark schemes.',
  founder: DEFAULT_BLOG_AUTHOR.name,
  areaServed: 'Worldwide',
  knowsAbout: [
    'Cambridge International Examinations',
    'A-Level past papers',
    'O-Level past papers',
    'Mark schemes',
    'Exam marking',
  ],
} as const
