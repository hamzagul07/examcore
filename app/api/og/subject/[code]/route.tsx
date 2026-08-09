import { createOgImage } from '@/lib/seo/og-image'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'

export const runtime = 'nodejs'

type Props = { params: Promise<{ code: string }> }

/** Per-syllabus paper OG for /subjects/[code] and /courses/[code] shares. */
export async function GET(_req: Request, { params }: Props) {
  const { code: raw } = await params
  const code = raw.trim().toUpperCase()
  const profile = getSubjectSeoProfile(code)
  return createOgImage({
    title: profile?.markingTitle ?? `Mark Cambridge ${code} past papers`,
    subtitle: profile?.tagline ?? `${code} · Real mark schemes · Free to try`,
  })
}
