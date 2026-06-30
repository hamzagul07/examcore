import 'server-only'

import { getBlogPosts, type BlogPostMeta } from '@/lib/blog'
import {
  isCambridgeSubjectGuideSlug,
  isIbIaGuideSlug,
  isIbSubjectGuideSlug,
  isSubjectGuideSlug,
} from '@/lib/seo/subject-guide-slugs'

export { isSubjectGuideSlug } from '@/lib/seo/subject-guide-slugs'
export {
  isCambridgeSubjectGuideSlug,
  isIbSubjectGuideSlug,
  isIbGuideSlug,
  isIbIaGuideSlug,
  isGradeBoundaryGuideSlug,
  subjectCodeFromBlogSlug,
  getSubjectGuideSlugForCode,
} from '@/lib/seo/subject-guide-slugs'

export function getSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => isSubjectGuideSlug(p.slug))
}

export function getCambridgeSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => isCambridgeSubjectGuideSlug(p.slug))
}

export function getIbSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => isIbSubjectGuideSlug(p.slug))
}

export function getIbIaGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => isIbIaGuideSlug(p.slug))
}

export function getNonSubjectGuidePosts(): BlogPostMeta[] {
  return getBlogPosts().filter((p) => !isSubjectGuideSlug(p.slug))
}
