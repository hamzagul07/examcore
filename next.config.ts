import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import { isSentryEnabled } from '@/lib/sentry/options'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const nextConfig: NextConfig = {
  // This site prerenders thousands of programmatic pages (command-words,
  // grade-boundary, past-paper topics, IB lessons …). Late in that large export
  // the default 60s per-page budget can be exceeded under memory/CPU pressure
  // even though each page is light, so give static generation more headroom.
  staticPageGenerationTimeout: 180,
  // Vercel serves everything under public/ from its CDN, so these files never
  // need to live inside a serverless function. Next's output file tracer would
  // otherwise bundle the whole public/courses/diagrams image tree (~190 MB) into
  // the lesson-rendering functions — because enrich-lesson-visual.ts does a
  // build-time fs.existsSync() against it — which pushed two functions past
  // Vercel's 250 MB unzipped limit. Keys are route globs; '/*' targets all
  // routes. content/source-notes is build-scripts-only (never read at runtime).
  outputFileTracingExcludes: {
    '/*': ['public/**', 'content/source-notes/**'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  async redirects() {
    return [
      {
        source: '/blog/why-i-built-examcore',
        destination: '/blog/why-i-built-markscheme',
        permanent: true,
      },
      {
        source: '/examcore',
        destination: '/',
        permanent: true,
      },
      {
        source: '/examcore/:path*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: true,
      },
      {
        source: '/sign-in',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/auth/signup',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disable: !process.env.SENTRY_AUTH_TOKEN?.trim(),
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
}

export default isSentryEnabled()
  ? withSentryConfig(nextConfig, sentryBuildOptions)
  : nextConfig
