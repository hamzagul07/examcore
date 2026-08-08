import {
  OXFORD_AQA_QUALIFICATIONS,
  getOxfordaqaQualification,
  getOxfordaqaSubject,
  getOxfordaqaSubjects,
  type OxfordaqaQualificationId,
  type OxfordaqaSubject,
} from '@/lib/oxfordaqa/catalog'
import { getExamSystem } from '@/lib/exam-systems'
import { qualificationHubPath, subjectHubPath } from '@/lib/exam-systems/paths'

const system = () => getExamSystem('oxfordaqa')

export function oxfordaqaRootPath(): string {
  return `/${system().routePrefix}`
}

export function oxfordaqaQualificationPath(qualificationSlug: string): string {
  return qualificationHubPath(system(), qualificationSlug)
}

export function oxfordaqaSubjectPath(
  qualification: OxfordaqaQualificationId | string,
  subjectSlug: string
): string {
  return subjectHubPath(system(), [qualification, subjectSlug])
}

export function oxfordaqaSubjectPastPapersPath(
  qualification: string,
  subjectSlug: string
): string {
  return `${oxfordaqaSubjectPath(qualification, subjectSlug)}/past-papers`
}

export function oxfordaqaSubjectBoundariesPath(
  qualification: string,
  subjectSlug: string
): string {
  return `${oxfordaqaSubjectPath(qualification, subjectSlug)}/grade-boundaries`
}

export function oxfordaqaPaperPath(
  qualification: string,
  subjectSlug: string,
  paperSlug: string
): string {
  return `${oxfordaqaSubjectPath(qualification, subjectSlug)}/${paperSlug}`
}

export function resolveOxfordaqaSubject(
  qualification: string,
  subjectSlug: string
): OxfordaqaSubject | null {
  const qual = getOxfordaqaQualification(qualification)
  if (!qual?.shellEnabled) return null
  return getOxfordaqaSubject(qualification, subjectSlug)
}

export function getAllOxfordaqaSubjectParams(): Array<{
  qualification: string
  subject: string
}> {
  return getOxfordaqaSubjects()
    .filter((s) => getOxfordaqaQualification(s.qualification)?.shellEnabled)
    .map((s) => ({
      qualification: s.qualification,
      subject: s.slug,
    }))
}

export function getAllOxfordaqaQualificationParams(): Array<{ qualification: string }> {
  return OXFORD_AQA_QUALIFICATIONS.filter((q) => q.shellEnabled).map((q) => ({
    qualification: q.slug,
  }))
}
