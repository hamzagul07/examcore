import type { MetadataRoute } from 'next'
import {
  SITEMAP_SHARD_IDS,
  buildSitemapShard,
  isSitemapShardId,
  type SitemapShardId,
} from '@/lib/seo/sitemap-shards'

/**
 * Named sitemap shards → Search Console can track each page type separately.
 * Shards: /sitemap/{id}.xml. Index: /sitemap-index.xml
 * (/sitemap.xml permanently redirects there — Next does not emit the index).
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
