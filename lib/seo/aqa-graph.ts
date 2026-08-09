import { getAqaSubject, getAqaSubjects, type AqaSubject } from '@/lib/aqa/catalog'
import { getExamSystem } from '@/lib/exam-systems'
import { qualificationHubPath, subjectHubPath } from '@/lib/exam-systems/paths'

const system = () => getExamSystem('aqa')

/** AQA owns /aqa/* — do not put AQA guides under /edexcel. */
export function aqaRootPath(): string {
  return `/${system().routePrefix}`
}

export function aqaQualificationPath(qualificationSlug = 'a-level'): string {
  return qualificationHubPath(system(), qualificationSlug)
}

export function aqaSubjectPath(subjectSlug: string, qualificationSlug = 'a-level'): string {
  return subjectHubPath(system(), [qualificationSlug, subjectSlug])
}

export function resolveAqaSubject(subjectSlug: string): AqaSubject | null {
  return getAqaSubject(subjectSlug)
}

export function getAllAqaSubjectParams(): Array<{ subject: string }> {
  return getAqaSubjects().map((s) => ({ subject: s.slug }))
}
