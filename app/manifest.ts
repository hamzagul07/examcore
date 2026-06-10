import type { MetadataRoute } from 'next'
import { DEFAULT_SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site-config'

export default function manifest(): MetadataRoute.Manifest {
  const base = SITE_URL.replace(/\/$/, '')

  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    start_url: `${base}/mark`,
    /** Browser tab — avoids aggressive "install app" prompts on iOS until a native app exists. */
    display: 'browser',
    background_color: '#f7f2e7',
    theme_color: '#bb2a25',
    icons: [
      {
        src: `${base}/icon`,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: `${base}/apple-icon`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
