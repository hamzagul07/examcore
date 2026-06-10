import { getSubjectColor } from '@/lib/design-system/subject-colors'
import { getCourseCatalog } from '@/lib/courses'

export type LandingSubjectPreview = {
  code: string
  name: string
  glyph: string
  color: string
  papers: number
  course: boolean
  lessons?: number
}

/** A-Level subjects shown on the landing preview grid (first 8). */
export const LANDING_SUBJECT_PREVIEW: LandingSubjectPreview[] = [
  { code: '9709', name: 'Mathematics', glyph: '∫', color: 'var(--ec-acc-blue)', papers: 124, course: true },
  { code: '9702', name: 'Physics', glyph: 'Ω', color: 'var(--ec-acc-violet)', papers: 112, course: true },
  { code: '9701', name: 'Chemistry', glyph: '⌬', color: 'var(--ec-acc-teal)', papers: 108, course: true },
  { code: '9700', name: 'Biology', glyph: 'ϕ', color: 'var(--ec-brand)', papers: 104, course: true },
  { code: '9708', name: 'Economics', glyph: '£', color: 'var(--ec-c-math)', papers: 96, course: false },
  { code: '9609', name: 'Business', glyph: '¶', color: 'var(--ec-acc-rose)', papers: 88, course: false },
  { code: '9618', name: 'Computer Science', glyph: '{}', color: 'var(--ec-acc-slate)', papers: 76, course: false },
  { code: '9489', name: 'History', glyph: '§', color: 'var(--ec-acc-violet)', papers: 68, course: false },
]

export function landingSubjectAccent(code: string): string {
  return getSubjectColor(code)
}

export function landingCourseMiniCards() {
  const catalog = getCourseCatalog()
  const codes = ['9709', '9702', '9701', '9700'] as const
  const names: Record<string, string> = {
    '9709': 'Mathematics',
    '9702': 'Physics',
    '9701': 'Chemistry',
    '9700': 'Biology',
  }

  return codes.map((code) => {
    const course = catalog.find((c) => c.code === code)
    const lessons = course?.publishedCount ?? course?.lessonCount ?? 0
    const questions = lessons > 0 ? Math.round(lessons * 5.8) : 0
    return {
      code,
      name: names[code],
      meta:
        lessons > 0
          ? `${lessons} lessons · ${questions} questions`
          : 'Course coming soon',
      href: course?.path ?? `/courses/${code}`,
    }
  })
}
