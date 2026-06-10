import { getBlogPost, getBlogPosts } from '@/lib/blog'
import { enrichPostMeta, sortPostsForIndex, type EnrichedBlogMeta } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'

function enrichAll() {
  return getBlogPosts().map((p) => {
    const full = getBlogPost(p.slug)
    return enrichPostMeta(p, full?.content ?? '')
  })
}

export function getFeaturedHubPost(): EnrichedBlogMeta | null {
  const sorted = sortPostsForIndex(enrichAll())
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
