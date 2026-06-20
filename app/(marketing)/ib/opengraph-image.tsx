import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'IB Diploma past papers & mark schemes — MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'IB Diploma past papers & mark schemes',
    subtitle: 'Every HL & SL subject · Markband guides · Free on MarkScheme',
  })
}
