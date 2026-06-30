import { getBlogCategory } from '@/lib/blog/meta'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guide-slugs'
import type { ContentFormat, SearchIntent } from '@/lib/seo/intent'
import { getClusterForSlug, type ContentClusterId } from '@/lib/seo/clusters'

export type PostSeoMeta = {
  intent: SearchIntent
  format: ContentFormat
  clusterId: ContentClusterId
}

function inferFormat(slug: string, category?: string | null): ContentFormat {
  if (isSubjectGuideSlug(slug)) return 'subject-guide'
  if (slug.startsWith('ib-') && slug.endsWith('-ia-guide')) return 'guide'
  if (/^best-/.test(slug) || slug.includes('combinations') || slug.includes('which-')) {
    return 'comparison'
  }
  if (/^how-to-/.test(slug) || slug.includes('how-to-')) return 'howto'
  if (category === 'mark-schemes' || category === 'exam-technique') return 'guide'
  return 'guide'
}

function inferIntent(slug: string, format: ContentFormat): SearchIntent {
  if (format === 'comparison' && slug.startsWith('best-')) return 'commercial'
  if (slug.includes('pricing') || slug.includes('tutor')) return 'commercial'
  if (format === 'subject-guide') return 'informational'
  return 'informational'
}

export function getPostSeoMeta(
  slug: string,
  category?: string | null
): PostSeoMeta {
  const resolvedCategory = category ?? getBlogCategory(slug, category)
  const format = inferFormat(slug, resolvedCategory)
  const cluster = getClusterForSlug(slug)
  return {
    intent: inferIntent(slug, format),
    format,
    clusterId: cluster.id,
  }
}
