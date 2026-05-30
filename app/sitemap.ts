import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getAllBlogSlugs } from '@/lib/blog'

const STATIC_ROUTES = [
  '',
  '/subjects',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/privacy',
  '/terms',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const base = SITE_URL.replace(/\/$/, '')

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.8,
  }))

  const blogEntries: MetadataRoute.Sitemap = getAllBlogSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticEntries, ...blogEntries]
}
