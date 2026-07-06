import { getBlogPost, getBlogPosts } from '@/lib/blog'
import { enrichPostMeta, sortPostsForIndex, type EnrichedBlogMeta } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import { getResultsDayPhase } from '@/lib/seo/results-day'
import { IB_MAY_2026_RESULTS_SLUG, isIbResultsSeason } from '@/lib/seo/ib-results-season'

/** Featured on blog/guides hub during the post-exam → results window. */
export const PRE_RESULTS_SPOTLIGHT_SLUG = 'cambridge-post-exam-results-prep-2026'

function enrichAll() {
  return getBlogPosts().map((p) => {
    const full = getBlogPost(p.slug)
    return enrichPostMeta(p, full?.content ?? '')
  })
}

export function getFeaturedHubPost(): EnrichedBlogMeta | null {
  const sorted = sortPostsForIndex(enrichAll())
  if (isIbResultsSeason()) {
    const ibSeasonal = sorted.find((p) => p.slug === IB_MAY_2026_RESULTS_SLUG)
    if (ibSeasonal) return ibSeasonal
  }
  if (getResultsDayPhase() === 'pre-alevel') {
    const seasonal = sorted.find((p) => p.slug === PRE_RESULTS_SPOTLIGHT_SLUG)
    if (seasonal) return seasonal
  }
  const candidate =
    sorted.find((p) => p.spotlight && !isSubjectGuideSlug(p.slug)) ??
    sorted.find((p) => p.featured && !isSubjectGuideSlug(p.slug)) ??
    sorted.find((p) => !isSubjectGuideSlug(p.slug))
  return candidate ?? null
}

export function getGuideGridPosts(
  excludeSlug?: string,
  limit = 6
): EnrichedBlogMeta[] {
  const sorted = sortPostsForIndex(enrichAll())
  return sorted
    .filter(
      (p) =>
        !isSubjectGuideSlug(p.slug) &&
        p.slug !== excludeSlug &&
        !p.isEditorial
    )
    .slice(0, limit)
}
