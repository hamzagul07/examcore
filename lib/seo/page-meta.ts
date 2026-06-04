import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo/metadata'

export type PageSeoEntry = {
  title: string
  description: string
  keywords?: string[]
}

/**
 * SEO titles & descriptions — primary keyword first, 50–60 chars before brand template.
 * Descriptions 120–160 chars for SERP snippets.
 */
export const PAGE_SEO: Record<string, PageSeoEntry> = {
  '/': {
    title: 'Cambridge past paper marking — upload handwriting',
    description:
      'Mark Cambridge A-Level & O-Level past papers mark-by-mark. Upload photos of your working, get B1/M1/A1 and essay-band feedback from real mark schemes. Free tier.',
  },
  '/mark': {
    title: 'Mark a Cambridge past paper online — free',
    description:
      'Upload handwritten answers or a full paper. MarkScheme scores against the official Cambridge mark scheme in ~30 seconds — maths, sciences, essays & MCQ.',
  },
  '/subjects': {
    title: 'Cambridge subjects — 9709, 9702, 9708 & more',
    description:
      'Every syllabus we mark: A-Level & O-Level codes, paper components, and links to past-paper guides. Point marks, essay bands, and MCQ from real schemes.',
  },
  '/how-it-works': {
    title: 'How MarkScheme marks past papers',
    description:
      'Pick a paper, photograph your answers, get mark-by-mark feedback tied to Cambridge mark schemes — not a generic AI grade. Whole papers & Examiner\'s Ink.',
  },
  '/pricing': {
    title: 'Pricing — free & paid marking plans',
    description:
      'Free tier to start, then Student, Scholar & Mastery plans for Cambridge marking. Credits never expire. Founding members get 50% off for life.',
  },
  '/faq': {
    title: 'FAQ — marking, privacy & accuracy',
    description:
      'Answers on handwritten uploads, mark scheme accuracy, AI limits, pricing, data privacy, and getting started with Cambridge A-Level and O-Level revision.',
  },
  '/about': {
    title: 'About — built by a Cambridge student',
    description:
      'MarkScheme was built for honest past-paper revision: real mark schemes, mark-by-mark feedback on your handwriting, and no inflated marketing claims.',
  },
  '/contact': {
    title: 'Contact — support & feedback',
    description:
      'Get help with Cambridge past-paper marking, billing, or partnerships. We reply to students and schools at hello@markscheme.app.',
  },
  '/blog': {
    title: 'Blog — Cambridge revision & exam tips',
    description:
      'Guides on self-marking, mark schemes, subject choice, 2026 exam prep, and syllabus past papers for Cambridge A-Level and O-Level students.',
  },
  '/guides': {
    title: 'Study guides — past papers & mark schemes',
    description:
      'Eight topic hubs: marking workflow, mark schemes, revision strategy, subject guides, 2026 integrity, and resources — built for search intent.',
  },
  '/insights': {
    title: 'Marking insights — self-mark gap data',
    description:
      'Original MarkScheme data on how students self-mark Cambridge papers vs a strict second pass — citable benchmarks for revision research.',
  },
  '/compare': {
    title: 'Compare — self-mark, tutor, or MarkScheme',
    description:
      'Honest comparison of Cambridge marking options: strict self-mark with the official scheme, MarkScheme second pass, and private tutor feedback.',
  },
  '/research': {
    title: 'Marking methodology — for press & schools',
    description:
      'How MarkScheme applies Cambridge mark schemes to handwritten answers — cite this page for press, educators, and link-building.',
  },
  '/privacy': {
    title: 'Privacy policy',
    description:
      'How MarkScheme handles your data, uploads, and account information when you mark Cambridge past papers on markscheme.app.',
  },
  '/terms': {
    title: 'Terms of service',
    description:
      'Terms for using MarkScheme to mark Cambridge International past papers — subscriptions, acceptable use, and limitations.',
  },
}

export function getPageMetadata(
  path: string,
  overrides?: Partial<PageSeoEntry> & { index?: boolean; ogImagePath?: string }
): Metadata {
  const base = PAGE_SEO[path]
  if (!base) {
    return createPageMetadata({
      title: overrides?.title ?? 'MarkScheme',
      description:
        overrides?.description ??
        'Cambridge A-Level and O-Level past-paper marking with real mark schemes.',
      path,
      keywords: overrides?.keywords,
      index: overrides?.index,
      ogImagePath: overrides?.ogImagePath,
    })
  }
  return createPageMetadata({
    title: overrides?.title ?? base.title,
    description: overrides?.description ?? base.description,
    path,
    keywords: overrides?.keywords ?? base.keywords,
    index: overrides?.index,
    ogImagePath: overrides?.ogImagePath,
  })
}
