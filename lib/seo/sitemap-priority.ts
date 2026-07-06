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
  'ib-grade-boundaries-explained',
  'cambridge-9709-mathematics-grade-boundaries-2026',
  'cambridge-9700-biology-grade-boundaries-2026',
  'cambridge-9702-physics-grade-boundaries-2026',
  'cambridge-9708-economics-grade-boundaries-2026',
  'cambridge-9609-business-grade-boundaries-2026',
  'cambridge-9990-psychology-grade-boundaries-2026',
  'cambridge-9489-history-grade-boundaries-2026',
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
