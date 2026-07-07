import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

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
]

const PUBLIC_ALLOW = [
  '/',
  '/blog/',
  '/courses/',
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
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
