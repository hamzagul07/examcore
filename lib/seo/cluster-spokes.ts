import 'server-only'

import { getBlogPosts } from '@/lib/blog'
import { getClusterById, type ContentClusterId } from '@/lib/seo/clusters'

export function getClusterSpokes(clusterId: ContentClusterId): string[] {
  const cluster = getClusterById(clusterId)
  if (!cluster) return []
  const slugs = getBlogPosts().map((p) => p.slug)
  return slugs.filter((slug) => {
    if (slug === cluster.pillarBlogSlug) return false
    if (cluster.explicitSlugs?.includes(slug)) return true
    return cluster.slugPatterns.some((re) => re.test(slug))
  })
}
