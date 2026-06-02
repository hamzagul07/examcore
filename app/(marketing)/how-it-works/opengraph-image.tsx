import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'How MarkScheme marking works'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Upload. Mark. Fix.',
    subtitle: 'Real Cambridge schemes · Examiner\'s Ink · Mastery tracking',
  })
}
