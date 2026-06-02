import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Sign in to MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Sign in',
    subtitle: 'Cambridge past paper marking',
  })
}
