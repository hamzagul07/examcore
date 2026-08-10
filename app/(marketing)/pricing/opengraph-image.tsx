import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'MarkScheme pricing — Cambridge marking plans'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Once you see the leak…',
    subtitle: 'Max rebuilds the desk. Cinema. Sunday coach.',
  })
}
