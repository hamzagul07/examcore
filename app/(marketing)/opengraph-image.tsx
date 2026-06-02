import { createOgImage } from '@/lib/seo/og-image'

export const alt = 'MarkScheme — Cambridge past paper marking'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return createOgImage({
    title: 'Your past papers, marked like the exam',
    subtitle: 'Handwritten past papers · real mark schemes · mark-by-mark in seconds',
  })
}
