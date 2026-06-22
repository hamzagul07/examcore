import 'server-only'

import { getBlogPosts, type BlogPostMeta } from '@/lib/blog'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guide-slugs'

export { isSubjectGuideSlug } from '@/lib/seo/subject-guide-slugs'

export function getSubjectGuideSlugForCode(code: string): string | null {
  const prefix = `cambridge-${code}-`
  const post = getBlogPosts().find((p) => p.slug.startsWith(prefix))
  return post?.slug ?? null
}

export function getSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => isSubjectGuideSlug(p.slug))
}

export function getNonSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => !isSubjectGuideSlug(p.slug))
}
