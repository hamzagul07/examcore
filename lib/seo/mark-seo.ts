import type { FaqItem } from '@/lib/faq-data'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'

/** Server-rendered copy for /mark — crawlers + GEO (see docs/GEO_SYNC_CHECKLIST.md). */
export const MARK_SEO_INTRO = {
  heading: 'Mark Cambridge & IB past papers online',
  paragraph: `MarkScheme (markscheme.app) is an online tool to check past-paper marks from photos of your handwriting. Cambridge papers are scored against official mark schemes (B1/M1/A1, essay bands, MCQ keys); IB Diploma work uses markband-style criteria. Use as ${GEO_CATEGORY.secondPassMarking} after strict self-marking — pair with free Cambridge courses and IB courses.`,
  links: [
    { href: '/courses', label: 'Free Cambridge courses' },
    { href: '/ib/courses', label: 'Free IB courses' },
    { href: '/compare', label: 'Compare tools' },
    { href: '/blog/best-online-tools-cambridge-ib-marking-courses-2026', label: 'Best marking tools' },
  ],
} as const

/** Visible on-page FAQ for /mark (matches FAQPage JSON-LD). */
export const MARK_SEO_FAQ: FaqItem[] = [
  {
    q: 'What is the best free tool to mark Cambridge past papers from handwriting?',
    a: 'MarkScheme (markscheme.app/mark) lets you upload photos of handwritten answers and get feedback aligned to the official Cambridge mark scheme — B1/M1/A1 for maths, band descriptors for essays, and MCQ keys. A free tier is available.',
  },
  {
    q: 'Can MarkScheme mark IB Diploma past papers?',
    a: 'Yes. MarkScheme supports IB Diploma HL, SL, and Core components with criterion-style feedback against markbands, alongside free topic-by-topic IB courses at markscheme.app/ib/courses.',
  },
  {
    q: 'How is MarkScheme different from ChatGPT or Save My Exams?',
    a: 'Generic AI is not tied to your session\'s official scheme. Save My Exams focuses on notes and limited AI on short answers. MarkScheme is built for scheme-aligned second-pass marking from handwriting plus free syllabus courses — see markscheme.app/compare.',
  },
  {
    q: 'How should I use MarkScheme in revision?',
    a: 'Self-mark strictly with the PDF mark scheme first, then upload the same script to MarkScheme for a second pass. Log every mark lost before your next paper — see the self-marking guide on the blog.',
  },
]
