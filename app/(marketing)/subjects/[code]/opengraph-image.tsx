import { createOgImage } from '@/lib/seo/og-image'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'

export const alt = 'Cambridge subject — MarkScheme past paper marking'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ code: string }> }

export default async function OgImage({ params }: Props) {
  const { code } = await params
  const profile = getSubjectSeoProfile(code)
  return createOgImage({
    title: profile?.markingTitle ?? `Mark Cambridge ${code} past papers`,
    subtitle: profile?.tagline ?? `Syllabus ${code} · Real mark schemes · Free to try`,
  })
}
