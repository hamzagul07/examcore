import 'server-only'

import { getIbCourse, getIbCourseLessons, getIbCourseSlugs } from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { getSyllabusTree } from '@/lib/syllabi'
import type { AccentToken } from '@/lib/courses/margin-notes/types'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'
import type { IbCatalogCard } from '@/lib/courses/ib-catalog-display'
import type { SubjectFamily } from '@/lib/courses/margin-notes/types'

function ibSyllabusCode(slug: string): string {
  return slug.startsWith('ib-') ? slug : `ib-${slug}`
}

function ibFamily(slug: string): SubjectFamily {
  const g = getIbSubject(slug)?.groupNumber
  if (g === 4) return 'Sciences'
  if (g === 5) return 'Maths'
  if (g === 3) return 'Commerce'
  return 'Humanities'
}

function ibAccent(slug: string): { token: AccentToken; hex: string } {
  const subject = getIbSubject(slug)
  const hex = subject?.accent ?? '#5c6bc0'
  const token = subjectAccent(slug)
  return { token, hex }
}

function countIbUnits(slug: string): number {
  const tree = getSyllabusTree(ibSyllabusCode(slug))
  return tree?.length ?? 1
}

export function adaptIbCatalogCard(slug: string, prog = 0): IbCatalogCard | null {
  const course = getIbCourse(slug)
  if (!course) return null
  const subject = getIbSubject(slug)
  const { token, hex } = ibAccent(slug)
  const lessons = course.lessonCount

  return {
    code: slug,
    name: course.name,
    glyph: subject?.glyph ?? '◆',
    acc: token,
    level: course.level,
    fam: ibFamily(slug),
    units: countIbUnits(slug),
    lessons,
    q: lessons * 2,
    prog,
    href: course.path,
    boardLabel: 'IB Diploma',
    accentHex: hex,
  }
}

export function getIbCatalogCards(progressByCode: Record<string, number> = {}): IbCatalogCard[] {
  return getIbCourseSlugs()
    .map((slug) => adaptIbCatalogCard(slug, progressByCode[slug] ?? 0))
    .filter((c): c is IbCatalogCard => c != null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function ibContinueCatalogEntries(): import('@/lib/courses/margin-notes/continue-learning').ContinueCatalogEntry[] {
  return getIbCourseSlugs()
    .map((slug) => {
      const course = getIbCourse(slug)
      if (!course) return null
      const lessons = getIbCourseLessons(slug)
      return {
        code: slug,
        name: course.name,
        lessonCount: lessons.length,
        basePath: '/ib/courses' as const,
        syllabusCode: ibSyllabusCode(slug),
        lessons: lessons.map((l) => ({
          slug: l.slug,
          topicCode: l.topicCode,
          title: l.title,
        })),
      }
    })
    .filter((e): e is NonNullable<typeof e> => e != null)
}
