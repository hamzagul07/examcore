import { sitemapIndexResponse } from '@/lib/seo/sitemap-index'

/**
 * Alias kept for older robots/GSC submissions.
 * Prefer https://markscheme.app/sitemap.xml going forward.
 */
export async function GET() {
  return sitemapIndexResponse()
}
