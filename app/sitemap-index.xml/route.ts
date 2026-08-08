import { SITE_URL } from '@/lib/site-config'
import { SITEMAP_SHARD_IDS } from '@/lib/seo/sitemap-shards'

/**
 * Explicit sitemap index for Search Console.
 * Next generateSitemaps serves shards at /sitemap/{id}.xml but does not emit
 * a sitemapindex document — this route fills that gap.
 */
export async function GET() {
  const base = SITE_URL.replace(/\/$/, '')
  const lastmod = new Date().toISOString()
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_SHARD_IDS.map(
  (id) => `  <sitemap>
    <loc>${base}/sitemap/${id}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
).join('\n')}
</sitemapindex>
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
