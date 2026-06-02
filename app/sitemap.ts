import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getAllBlogSlugs, getBlogPostLastModified } from '@/lib/blog'

const STATIC_ROUTES = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/mark', priority: 0.95, changeFrequency: 'weekly' as const },
  { path: '/subjects', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/how-it-works', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.75, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.65, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/join', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/auth/signin', priority: 0.45, changeFrequency: 'monthly' as const },
  { path: '/auth/signup', priority: 0.45, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const base = SITE_URL.replace(/\/$/, '')

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const blogEntries: MetadataRoute.Sitemap = getAllBlogSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: getBlogPostLastModified(slug) ?? now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  return [...staticEntries, ...blogEntries]
}
