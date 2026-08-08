import {
  EDEXCEL_QUALIFICATIONS,
  getEdexcelQualification,
  getEdexcelSubject,
  getEdexcelSubjects,
  type EdexcelQualificationId,
  type EdexcelSubject,
} from '@/lib/edexcel/catalog'
import { getExamSystem } from '@/lib/exam-systems'
import { qualificationHubPath, subjectHubPath } from '@/lib/exam-systems/paths'

const system = () => getExamSystem('edexcel')

export function edexcelRootPath(): string {
  return `/${system().routePrefix}`
}

export function edexcelQualificationPath(qualificationSlug: string): string {
  return qualificationHubPath(system(), qualificationSlug)
}

export function edexcelSubjectPath(
  qualification: EdexcelQualificationId | string,
  subjectSlug: string
): string {
  return subjectHubPath(system(), [qualification, subjectSlug])
}

export function edexcelSubjectPastPapersPath(
  qualification: string,
  subjectSlug: string
): string {
  return `${edexcelSubjectPath(qualification, subjectSlug)}/past-papers`
}

export function edexcelSubjectBoundariesPath(
  qualification: string,
  subjectSlug: string
): string {
  return `${edexcelSubjectPath(qualification, subjectSlug)}/grade-boundaries`
}

export function edexcelUnitPath(
  qualification: string,
  subjectSlug: string,
  unitCode: string
): string {
  return `${edexcelSubjectPath(qualification, subjectSlug)}/${unitCode.toLowerCase()}`
}

export function resolveEdexcelSubject(
  qualification: string,
  subjectSlug: string
): EdexcelSubject | null {
  const qual = getEdexcelQualification(qualification)
  if (!qual?.shellEnabled) return null
  return getEdexcelSubject(qualification, subjectSlug)
}

export function getAllEdexcelSubjectParams(): Array<{
  qualification: string
  subject: string
}> {
  return getEdexcelSubjects()
    .filter((s) => getEdexcelQualification(s.qualification)?.shellEnabled)
    .map((s) => ({
      qualification: s.qualification,
      subject: s.slug,
    }))
}

export function getAllEdexcelQualificationParams(): Array<{ qualification: string }> {
  // Include shell-enabled qualifications even when they have zero subjects yet (IGCSE).
  return EDEXCEL_QUALIFICATIONS.filter((q) => q.shellEnabled).map((q) => ({
    qualification: q.slug,
  }))
}
