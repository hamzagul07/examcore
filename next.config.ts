import type { NextConfig } from 'next'

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

export default nextConfig
