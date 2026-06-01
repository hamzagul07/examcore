import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

export default function manifest(): MetadataRoute.Manifest {
  const base = SITE_URL.replace(/\/$/, '')

  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      'Cambridge A-Level and O-Level marking with examiner-grade feedback in seconds.',
    start_url: `${base}/dashboard`,
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#00f5a0',
    icons: [
      {
        src: `${base}/icon`,
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  }
}
