import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'Cambridge past papers & mark schemes — MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Cambridge past papers & mark schemes',
    subtitle: 'Practise real papers · Instant mark-scheme marking · Free to start',
  })
}
