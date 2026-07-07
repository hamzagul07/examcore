import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog/', '/courses/', '/mark', '/subjects/', '/past-papers/', '/ib', '/ib/', '/tools/', '/guides/', '/feed.xml'],
        disallow: [
          '/api/',
          '/auth/callback',
          '/auth/signout',
          '/auth/verify-email',
          '/dashboard',
          '/account',
          '/onboarding',
          '/teacher',
          '/admin',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
