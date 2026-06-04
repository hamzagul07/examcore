import { getBlogPost } from '@/lib/blog'
import { isEditorialPost } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'

export function blogSitemapPriority(slug: string): number {
  const post = getBlogPost(slug)
  if (post?.spotlight) return 0.88
  if (post?.featured) return 0.85
  if (isEditorialPost(slug, post?.category)) return 0.8
  if (isSubjectGuideSlug(slug)) return 0.78
  return 0.66
}
