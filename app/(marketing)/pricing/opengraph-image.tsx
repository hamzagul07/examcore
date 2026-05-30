import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Examcore pricing — free during early access'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Free during early access',
    subtitle: 'Unlimited marking · 15 subjects · No card required',
  })
}
