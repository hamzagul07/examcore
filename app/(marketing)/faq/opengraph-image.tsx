import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Examcore FAQ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Frequently asked questions',
    subtitle: 'Marking, privacy, pricing & getting started',
  })
}
