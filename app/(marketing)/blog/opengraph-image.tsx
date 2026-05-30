import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Examcore blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Blog',
    subtitle: 'Exam tips, study strategies & product updates',
  })
}
