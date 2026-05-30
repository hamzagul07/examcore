import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'About Examcore'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Built by a student, for students',
    subtitle: 'Real Cambridge schemes · Honest AI marking',
  })
}
