import { getBlogPost } from '@/lib/blog'
import { isEditorialPost } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'

/** IB pillar / cross-subject guides — higher crawl priority than per-subject spokes. */
const IB_EDITORIAL_SLUGS = new Set([
  'ib-diploma-past-papers-guide',
  'ib-free-courses-guide',
  'ib-how-to-get-a-7-diploma',
  'ib-markbands-explained',
  'ib-grade-boundaries-explained',
  'ib-command-terms-explained',
  'ib-internal-assessment-complete-guide',
  'ib-exam-revision-strategy',
  'ib-predicted-grades-explained',
  'ib-maths-aa-vs-ai-which-to-choose',
  'ib-vs-a-level',
  'ib-tok-past-papers-guide',
  'ib-extended-essay-complete-guide',
  'ib-cas-complete-guide',
  'ib-how-to-build-a-grade-7-buffer-2026',
  'ib-results-day-2026-what-to-expect',
  'ib-post-exam-results-prep-2026',
  'ib-grade-boundaries-explained',
  'cambridge-9709-mathematics-grade-boundaries-2026',
  'cambridge-9700-biology-grade-boundaries-2026',
  'cambridge-9702-physics-grade-boundaries-2026',
  'cambridge-9708-economics-grade-boundaries-2026',
  'cambridge-9609-business-grade-boundaries-2026',
  'cambridge-9990-psychology-grade-boundaries-2026',
  'cambridge-9489-history-grade-boundaries-2026',
  'cambridge-9699-sociology-grade-boundaries-2026',
  'cambridge-9706-accounting-grade-boundaries-2026',
  'cambridge-9084-law-grade-boundaries-2026',
  'cambridge-9618-computer-science-grade-boundaries-2026',
  'cambridge-9607-media-studies-grade-boundaries-2026',
  'cambridge-2210-computer-science-grade-boundaries-2026',
  'cambridge-9231-further-mathematics-grade-boundaries-2026',
  'cambridge-4024-mathematics-grade-boundaries-2026',
  'cambridge-2281-economics-grade-boundaries-2026',
  'cambridge-7115-business-studies-grade-boundaries-2026',
  'cambridge-5090-biology-grade-boundaries-2026',
  'cambridge-5070-chemistry-grade-boundaries-2026',
  'cambridge-5054-physics-grade-boundaries-2026',
  'cambridge-4037-additional-mathematics-grade-boundaries-2026',
  'cambridge-7707-accounting-grade-boundaries-2026',
  'cambridge-9488-islamic-studies-grade-boundaries-2026',
  'cambridge-9696-geography-grade-boundaries-2026',
  'cambridge-0460-geography-grade-boundaries-2026',
  'cambridge-0580-mathematics-grade-boundaries-2026',
  'cambridge-0990-first-language-english-grade-boundaries-2026',
  'cambridge-9695-literature-in-english-grade-boundaries-2026',
  'cambridge-0610-biology-grade-boundaries-2026',
  'cambridge-0620-chemistry-grade-boundaries-2026',
  'cambridge-0625-physics-grade-boundaries-2026',
  'most-repeated-cambridge-sociology-past-paper-topics-2026',
  'most-repeated-cambridge-geography-past-paper-topics-2026',
  'most-repeated-cambridge-accounting-past-paper-topics-2026',
  'most-repeated-cambridge-law-past-paper-topics-2026',
  'most-repeated-cambridge-media-studies-past-paper-topics-2026',
  'most-repeated-cambridge-islamic-studies-past-paper-topics-2026',
  'cambridge-post-exam-results-prep-2026',
  'cambridge-may-june-2026-grade-thresholds-what-to-expect',
  'cambridge-results-day-august-2026-guide',
])

export function blogSitemapPriority(slug: string): number {
  const post = getBlogPost(slug)
  if (post?.spotlight) return 0.88
  if (post?.featured) return 0.85
  if (isEditorialPost(slug, post?.category)) return 0.8
  if (isSubjectGuideSlug(slug)) return 0.78
  if (IB_EDITORIAL_SLUGS.has(slug)) return 0.84
  if (slug.startsWith('ib-') && slug.endsWith('-past-papers-guide')) return 0.74
  if (slug.startsWith('ib-')) return 0.7
  return 0.66
}
