import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Contact Examcore'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Get in touch',
    subtitle: 'Feedback & support during early access',
  })
}
