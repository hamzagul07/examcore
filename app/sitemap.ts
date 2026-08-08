import type { MetadataRoute } from 'next'
import {
  SITEMAP_SHARD_IDS,
  buildSitemapShard,
  isSitemapShardId,
  type SitemapShardId,
} from '@/lib/seo/sitemap-shards'

/**
 * Named sitemap shards → Search Console can track each page type separately.
 * With generateSitemaps, /sitemap.xml is the index; shards live at
 * /sitemap/{id}.xml (e.g. /sitemap/caie-topics.xml).
 *
 * Intentionally omitted from all shards: /embed/*, /challenge/* (noindex junk).
 * Per-lesson /courses/... URLs omitted — canonical public graph is /caie/...
 */
export async function generateSitemaps() {
  return SITEMAP_SHARD_IDS.map((id) => ({ id }))
}

export default async function sitemap(props: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id
  if (!isSitemapShardId(id)) return []
  return buildSitemapShard(id as SitemapShardId)
}
