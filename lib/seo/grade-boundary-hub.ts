import 'server-only'

import { getBlogPosts } from '@/lib/blog'
import {
  buildSubjectPageCopy,
  getGradeBoundaryCalculatorPages,
  isValidMarkingSubjectCode,
} from '@/lib/seo/programmatic-subjects'
import {
  getOfficialBoundaries,
  getSubjectsWithOfficialData,
} from '@/lib/seo/grade-boundaries-data'

export type GradeBoundaryHubEntry = {
  code: string
  label: string
  level: string
  calculatorPath: string
  subjectPath: string
  guideSlug: string | null
  guideTitle: string | null
  hasOfficialData: boolean
  latestSession: string | null
}

export function getGradeBoundaryGuideSlug(code: string): string | null {
  const post = getBlogPosts().find(
    (p) => p.slug.startsWith(`cambridge-${code}-`) && p.slug.includes('grade-boundaries')
  )
  return post?.slug ?? null
}

export function getGradeBoundaryHubEntries(): GradeBoundaryHubEntry[] {
  const officialCodes = new Set(getSubjectsWithOfficialData())

  return getGradeBoundaryCalculatorPages().map((subject) => {
    const copy = buildSubjectPageCopy(subject)
    const guideSlug = getGradeBoundaryGuideSlug(subject.code)
    const guide = guideSlug
      ? getBlogPosts().find((p) => p.slug === guideSlug)
      : undefined
    const official = officialCodes.has(subject.code)
      ? getOfficialBoundaries(subject.code)
      : null
    const hasMarking = isValidMarkingSubjectCode(subject.code)

    return {
      code: subject.code,
      label: subject.label,
      level: copy.level,
      calculatorPath: `/tools/grade-boundary-calculator/${subject.code}`,
      subjectPath: hasMarking ? `/subjects/${subject.code}` : '/mark',
      guideSlug,
      guideTitle: guide?.title ?? null,
      hasOfficialData: officialCodes.has(subject.code),
      latestSession: official?.sessions[0]?.session ?? null,
    }
  })
}

export function getGradeBoundaryHubEntry(code: string): GradeBoundaryHubEntry | null {
  return getGradeBoundaryHubEntries().find((e) => e.code === code) ?? null
}
