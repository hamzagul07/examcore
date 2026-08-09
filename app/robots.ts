import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { SITEMAP_SHARD_IDS } from '@/lib/seo/sitemap-shards'

const PRIVATE_PREFIXES = [
  '/api/',
  '/auth/callback',
  '/auth/signout',
  '/auth/verify-email',
  '/dashboard',
  '/account',
  '/onboarding',
  '/teacher',
  '/admin',
  '/embed/',
  '/challenge/',
]

const PUBLIC_ALLOW = [
  '/',
  '/blog/',
  '/courses/',
  '/caie/',
  '/questions/',
  '/markscheme/',
  '/results-2026',
  '/results-2026/',
  '/mark',
  '/subjects/',
  '/past-papers/',
  '/ib',
  '/ib/',
  '/tools/',
  '/guides/',
  '/feed.xml',
  '/llms-full.txt',
  '/compare',
  '/research',
  '/insights',
  '/for-teachers',
  '/changelog',
  '/faq',
  '/llms.txt',
]

const AI_AND_DEFAULT_AGENTS = [
  '*',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Google-Extended',
  'anthropic-ai',
  'ClaudeBot',
]

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '')

  return {
    rules: AI_AND_DEFAULT_AGENTS.map((userAgent) => ({
      userAgent,
      allow: PUBLIC_ALLOW,
      disallow: PRIVATE_PREFIXES,
    })),
    // Prefer the real index; /sitemap.xml 301s here for legacy GSC submissions.
    sitemap: [
      `${base}/sitemap-index.xml`,
      `${base}/sitemap.xml`,
      ...SITEMAP_SHARD_IDS.map((id) => `${base}/sitemap/${id}.xml`),
    ],
    host: base,
  }
}
