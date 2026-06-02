import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Join a MarkScheme classroom'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Join a classroom',
    subtitle: 'Enter your teacher’s invite code',
  })
}
