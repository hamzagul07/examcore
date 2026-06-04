/**
 * Search intent + content format — match SERP expectations (list vs guide vs tool).
 * @see docs/SEO_TWELVE_PILLARS.md
 */

export type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'commercial'
  | 'transactional'

export type ContentFormat =
  | 'guide'
  | 'howto'
  | 'comparison'
  | 'checklist'
  | 'hub'
  | 'subject-guide'

export type PageSeoProfile = {
  intent: SearchIntent
  format: ContentFormat
  primaryKeyword: string
}

/** Marketing / product routes — intent drives layout & CTA prominence. */
export const PAGE_SEO_PROFILES: Record<string, PageSeoProfile> = {
  '/': {
    intent: 'commercial',
    format: 'hub',
    primaryKeyword: 'Cambridge past paper marking',
  },
  '/mark': {
    intent: 'transactional',
    format: 'hub',
    primaryKeyword: 'mark a Cambridge past paper online',
  },
  '/subjects': {
    intent: 'informational',
    format: 'hub',
    primaryKeyword: 'Cambridge subject codes past papers',
  },
  '/how-it-works': {
    intent: 'informational',
    format: 'howto',
    primaryKeyword: 'how Cambridge past paper marking works',
  },
  '/pricing': {
    intent: 'commercial',
    format: 'comparison',
    primaryKeyword: 'Cambridge marking pricing',
  },
  '/faq': {
    intent: 'informational',
    format: 'checklist',
    primaryKeyword: 'Cambridge marking FAQ',
  },
  '/about': {
    intent: 'navigational',
    format: 'guide',
    primaryKeyword: 'about MarkScheme',
  },
  '/contact': {
    intent: 'navigational',
    format: 'guide',
    primaryKeyword: 'contact MarkScheme',
  },
  '/blog': {
    intent: 'informational',
    format: 'hub',
    primaryKeyword: 'Cambridge revision blog',
  },
  '/guides': {
    intent: 'informational',
    format: 'hub',
    primaryKeyword: 'Cambridge past paper guides',
  },
}

export function getPageSeoProfile(path: string): PageSeoProfile | undefined {
  return PAGE_SEO_PROFILES[path]
}
