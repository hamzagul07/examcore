import { SITE_URL } from '@/lib/site-config'
import { SITEMAP_SHARD_IDS } from '@/lib/seo/sitemap-shards'

/**
 * Sitemap index XML listing every named shard.
 * Next `generateSitemaps` serves `/sitemap/{id}.xml` but does not emit this
 * document at `/sitemap.xml` — we serve it ourselves for Search Console.
 */
export function buildSitemapIndexXml(now = new Date()): string {
  const base = SITE_URL.replace(/\/$/, '')
  const lastmod = now.toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_SHARD_IDS.map(
  (id) => `  <sitemap>
    <loc>${base}/sitemap/${id}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
).join('\n')}
</sitemapindex>
`
}

export function sitemapIndexResponse(now = new Date()): Response {
  return new Response(buildSitemapIndexXml(now), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
