import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Create a MarkScheme account'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Create your account',
    subtitle: 'Free tier · Cambridge past papers',
  })
}
