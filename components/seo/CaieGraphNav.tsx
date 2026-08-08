import Link from 'next/link'
import type { CaieSurface } from '@/lib/seo/caie-graph'
import { CAIE_SURFACES, caieSurfacePath, lessonHasSurface } from '@/lib/seo/caie-graph'
import type { CourseLesson } from '@/lib/courses/types'

const LABELS: Record<CaieSurface, string> = {
  flashcards: 'Flashcards',
  faq: 'FAQ',
  quiz: 'Quiz',
  questions: 'Questions',
  mistakes: 'Common mistakes',
}

export function CaieGraphNav({
  code,
  lesson,
  active,
}: {
  code: string
  lesson: CourseLesson
  active?: CaieSurface | 'lesson'
}) {
  const lessonPath = caieSurfacePath(code, lesson.slug, 'flashcards')?.replace(
    /\/flashcards$/,
    ''
  )
  if (!lessonPath) return null

  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Lesson surfaces">
      <Link
        href={lessonPath}
        className={
          active === 'lesson' || !active
            ? 'ec-btn-primary min-h-[40px] text-sm'
            : 'ec-btn-ghost min-h-[40px] text-sm'
        }
      >
        Lesson
      </Link>
      {CAIE_SURFACES.filter((s) => lessonHasSurface(lesson, s)).map((surface) => {
        const href = caieSurfacePath(code, lesson.slug, surface)
        if (!href) return null
        return (
          <Link
            key={surface}
            href={href}
            className={
              active === surface
                ? 'ec-btn-primary min-h-[40px] text-sm'
                : 'ec-btn-ghost min-h-[40px] text-sm'
            }
          >
            {LABELS[surface]}
          </Link>
        )
      })}
      <Link
        href={`/mark?subject=${encodeURIComponent(code)}&topic=${encodeURIComponent(lesson.topicCode)}`}
        className="ec-btn-ghost min-h-[40px] text-sm"
      >
        Mark this topic
      </Link>
    </nav>
  )
}
