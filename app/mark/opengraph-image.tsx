import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Mark your Cambridge answer on MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Get marked in 30 seconds',
    subtitle: 'Cambridge past paper · real mark scheme · B1 M1 A1 feedback',
  })
}
