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
      'Mark Cambridge & IB past papers mark-by-mark, learn in free syllabus courses, and discuss in Exam Room. Scheme-aligned second-pass marking from handwriting. Free tier.',
  },
  '/mark': {
    title: 'Mark Cambridge & IB past papers online — free',
    description:
      'Online tool to check past-paper marks: upload handwritten answers or a full paper. MarkScheme scores Cambridge papers against official mark schemes (B1/M1/A1, bands, MCQ) and IB work against markbands — ~30s per question. Free tier.',
  },
  '/subjects': {
    title: 'Cambridge subjects — 9709, 9702, 9708 & more',
    description:
      'Every syllabus we mark: A-Level & O-Level codes, paper components, and links to past-paper guides. Point marks, essay bands, and MCQ from real schemes.',
  },
  '/how-it-works': {
    title: 'How second-pass marking works — Cambridge & IB',
    description:
      'Upload handwritten past-paper answers for scheme-aligned second-pass marking: Cambridge B1/M1/A1, essay bands, MCQ, and IB markbands. Honest limits explained.',
  },
  '/pricing': {
    title: 'Pricing — free & paid marking plans',
    description:
      'Free plan forever with notes & formulas. Scholar & Max include a 7-day free trial when you subscribe from pricing.',
  },
  '/faq': {
    title: 'FAQ — Cambridge & IB marking, privacy & pricing',
    description:
      'Answers on handwritten uploads, Cambridge mark schemes, IB markbands, AI limits, pricing, data privacy, Exam Room, and getting started with past-paper revision.',
    keywords: [
      'Cambridge marking FAQ',
      'IB marking FAQ',
      'AI marking A-Level',
      'free past paper marking',
      'MarkScheme questions',
    ],
  },
  '/for-teachers': {
    title: 'For teachers & schools — classroom marking analytics',
    description:
      'MarkScheme classrooms: invite codes, class blindspot radar, grade-risk matrix, and review queue on top of Cambridge & IB past-paper marking from handwriting.',
    keywords: [
      'Cambridge teacher marking tool',
      'IB classroom analytics',
      'past paper homework marking',
      'school revision platform',
    ],
  },
  '/changelog': {
    title: 'Changelog — MarkScheme product updates',
    description:
      'Shipped features: Cambridge & IB marking, free courses, Exam Room communities, teacher dashboards, and marking insights — indexable release notes.',
    keywords: ['MarkScheme updates', 'MarkScheme features', 'past paper marking app'],
  },
  '/about': {
    title: 'About — student-built marking & courses',
    description:
      'MarkScheme was built by a Cambridge A-Level student for second-pass past-paper marking (Cambridge & IB), free syllabus courses, and Exam Room communities — honest about AI limits.',
  },
  '/contact': {
    title: 'Contact — support, schools & press',
    description:
      'Contact MarkScheme for Cambridge & IB marking help, school classroom enquiries, press facts, partnerships, and billing at hello@markscheme.app.',
    keywords: [
      'MarkScheme contact',
      'school marking tool enquiry',
      'MarkScheme press',
      'Cambridge revision support',
    ],
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
    title: 'Marking insights — Cambridge & IB self-mark data',
    description:
      'Original MarkScheme dataset on self-marking gaps vs a strict second pass — Cambridge method marks, essay bands, and IB markbands. Citable CC BY 4.0 benchmarks.',
  },
  '/compare': {
    title: 'Compare — marking & revision tools (Cambridge & IB)',
    description:
      'Honest comparison: self-marking, MarkScheme, tutors, Save My Exams, PMT, ZNotes, and IB platforms — handwriting upload, courses, cost, and scheme-aligned feedback.',
  },
  '/research': {
    title: 'Press kit — MarkScheme facts & methodology',
    description:
      'Press and educator facts: Cambridge & IB marking from handwriting, free courses, Exam Room, stats, citation format, and second-pass marking methodology.',
    keywords: [
      'MarkScheme press',
      'MarkScheme facts',
      'Cambridge marking methodology',
      'IB marking tool',
      'past paper marking research',
    ],
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
