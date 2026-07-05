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
    // Keep ≤47 chars — formatSerpTitle truncates anything longer once the
    // " — MarkScheme" suffix is added, shipping a literal "…" in the tag.
    title: 'Cambridge & IB past paper marking, free courses',
    description:
      'Mark Cambridge & IB past papers mark-by-mark, learn in free syllabus courses, and discuss in Exam Room subject communities. Upload handwriting — B1/M1/A1 feedback. Free tier.',
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
      'Free plan forever with notes & formulas. Scholar & Max include a 7-day free trial when you subscribe from pricing.',
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
    title: 'Blog — Cambridge & IB revision tips',
    description:
      'Guides on self-marking, mark schemes, IB markbands, subject choice, 2026 exam prep, and syllabus past papers for Cambridge and IB Diploma students.',
  },
  '/guides': {
    title: 'Study guides — Cambridge & IB past papers',
    description:
      'Twelve topic hubs: Cambridge marking, mark schemes, grade boundaries, IB Diploma past papers & markbands, revision strategy, subject guides, and free resources.',
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
  '/courses': {
    title: 'Free Cambridge & IB courses — A-Level, O-Level & Diploma',
    description:
      'Free syllabus-aligned courses for Cambridge International and IB Diploma subjects. Topic-by-topic visual lessons, exam tips, and marking — 9709, 9702, TOK, Extended Essay & more.',
    keywords: [
      'free A Level course',
      'free Cambridge notes',
      'free IB course',
      'IB TOK course',
      '9709 course free',
      '9702 physics course',
      '9609 business course',
      'ZNotes alternative free',
    ],
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
  '/refunds': {
    title: 'Refund & cancellation policy',
    description:
      'How refunds, cancellations, and the Scholar/Max free trial work on MarkScheme — including your 14-day cooling-off rights and our goodwill refund promise.',
  },
  '/cookies': {
    title: 'Cookie policy',
    description:
      'The small set of cookies and local storage MarkScheme uses — for sign-in, preferences, and basic analytics. No advertising trackers, no data selling.',
  },
  '/community/guidelines': {
    title: 'Community guidelines',
    description:
      'How MarkScheme community notes and Q&A work — be helpful, honest and kind. What to do, what not to do, and how moderation and reporting work.',
  },
  '/community': {
    title: 'Exam Room — Cambridge A-Level & IB community',
    description:
      'Free student community for Cambridge A-Level and IB Diploma. Ask past-paper doubts, share cheat sheets and PDFs, discuss grade boundaries — every subject has its own room.',
    keywords: [
      'Cambridge A Level forum',
      'IB Diploma discussion',
      'past paper help community',
      'grade boundaries',
      'A Level revision forum',
      'IB study group',
    ],
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
