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
    /* Matches the zen warm-paper canvas + brand green (see theme.css). */
    background_color: '#faf9f6',
    theme_color: '#19774d',
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
      {
        src: `${base}/favicon.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${base}/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
