import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { CaieSurfacePage } from '@/components/seo/CaieSurfacePage'
import {
  CAIE_SURFACES,
  type CaieSurface,
  getAllCaieSurfaceParams,
  lessonHasSurface,
  resolveCaieLesson,
  caieSurfacePath,
} from '@/lib/seo/caie-graph'

type Props = {
  params: Promise<{
    level: string
    subject: string
    code: string
    topic: string
    surface: string
  }>
}

function asSurface(value: string): CaieSurface | null {
  return (CAIE_SURFACES as string[]).includes(value) ? (value as CaieSurface) : null
}

export function generateStaticParams() {
  return getAllCaieSurfaceParams()
}

export async function generateMetadata({ params }: Props) {
  const { level, subject, code, topic, surface: surfaceRaw } = await params
  const surface = asSurface(surfaceRaw)
  if (!surface) return {}
  const resolved = resolveCaieLesson(level, subject, code, topic)
  if (!resolved || !lessonHasSurface(resolved.lesson, surface)) return {}
  const path = caieSurfacePath(code, resolved.lesson.slug, surface)!
  const label = surface.charAt(0).toUpperCase() + surface.slice(1)
  return createPageMetadata({
    title: `${resolved.lesson.title} ${label} — ${code} ${resolved.ref.name}`,
    description: `Cambridge ${code} ${surface} for ${resolved.lesson.title} (syllabus ${resolved.lesson.topicCode}). Linked to free past-paper marking.`,
    path,
    keywords: [
      `${code} ${resolved.lesson.title} ${surface}`,
      `${resolved.lesson.topicCode} ${surface}`,
    ],
  })
}

export default async function CaieLessonSurfaceRoute({ params }: Props) {
  const { level, subject, code, topic, surface: surfaceRaw } = await params
  const surface = asSurface(surfaceRaw)
  if (!surface) notFound()
  const resolved = resolveCaieLesson(level, subject, code, topic)
  if (!resolved || !lessonHasSurface(resolved.lesson, surface)) notFound()
  const path = caieSurfacePath(code, resolved.lesson.slug, surface)!
  return (
    <CaieSurfacePage
      ref={resolved.ref}
      lesson={resolved.lesson}
      surface={surface}
      path={path}
    />
  )
}
