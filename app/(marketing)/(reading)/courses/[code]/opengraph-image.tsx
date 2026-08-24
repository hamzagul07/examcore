import { createOgImage } from '@/lib/seo/og-image'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'

export const alt = 'Free Cambridge course — MarkScheme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ code: string }> }

export default async function OgImage({ params }: Props) {
  const { code } = await params
  const profile = getSubjectSeoProfile(code)
  return createOgImage({
    title: profile?.courseTitle ?? `Free Cambridge ${code} course`,
    subtitle: profile?.tagline ?? `${code} · Topic-by-topic · 100% free`,
  })
}
