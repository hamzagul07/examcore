import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Cambridge A-Level subjects — MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Cambridge A-Levels we mark',
    subtitle: '15 subjects · Real mark schemes · MCQ, points & essays',
  })
}
