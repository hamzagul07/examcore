import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Examcore — AI marking for Cambridge A-Levels'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Your past papers, marked like the exam',
    subtitle: 'Cambridge A-Level marking across 15 subjects — start free, upgrade when ready',
  })
}
