import type { EdexcelSubject } from '@/lib/edexcel/catalog'
import { EDEXCEL_QUALIFICATIONS } from '@/lib/edexcel/catalog'
import {
  edexcelQualificationPath,
  edexcelRootPath,
  edexcelSubjectBoundariesPath,
  edexcelSubjectPastPapersPath,
  edexcelSubjectPath,
} from '@/lib/seo/edexcel-graph'

export function buildEdexcelHubCopy() {
  return {
    title: 'Edexcel International — IAL & International GCSE',
    description:
      'Edexcel International A Level and International GCSE hubs on MarkScheme: unit maps, grade boundaries, past-paper indexes and examiner-style marking for Maths, Physics, Chemistry and Biology.',
    path: edexcelRootPath(),
    keywords: [
      'Edexcel International A Level',
      'Edexcel IAL',
      'Pearson Edexcel',
      'Edexcel past papers',
      'Edexcel mark scheme',
      'International A Level Maths',
    ],
  }
}

export function buildEdexcelQualificationCopy(qualificationSlug: string) {
  const qual = EDEXCEL_QUALIFICATIONS.find((q) => q.slug === qualificationSlug)
  if (!qual) return null
  return {
    title: `Edexcel ${qual.label} — subjects, units & marking`,
    description: `${qual.blurb} Browse subject hubs for unit structure, past papers and grade boundaries.`,
    path: edexcelQualificationPath(qual.slug),
    keywords: [
      `Edexcel ${qual.label}`,
      `Pearson Edexcel ${qual.shortLabel}`,
      'Edexcel mark scheme',
      'Edexcel past papers',
    ],
  }
}

export function buildEdexcelSubjectCopy(subject: EdexcelSubject) {
  const qual = EDEXCEL_QUALIFICATIONS.find((q) => q.slug === subject.qualification)
  const qualLabel = qual?.label ?? 'International A Level'
  const unitList = subject.units.map((u) => u.code).join(', ')
  return {
    title: `Edexcel IAL ${subject.name} — units, past papers & marking`,
    description: `${subject.blurb} Units: ${unitList}.`,
    path: edexcelSubjectPath(subject.qualification, subject.slug),
    pastPapersPath: edexcelSubjectPastPapersPath(subject.qualification, subject.slug),
    boundariesPath: edexcelSubjectBoundariesPath(subject.qualification, subject.slug),
    keywords: [
      `Edexcel IAL ${subject.name}`,
      `Edexcel International A Level ${subject.name}`,
      `${subject.familyCode} past papers`,
      `Edexcel ${subject.name} mark scheme`,
      `Edexcel ${subject.name} grade boundaries`,
      qualLabel,
    ],
  }
}
