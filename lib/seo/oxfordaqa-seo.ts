import type { OxfordaqaSubject } from '@/lib/oxfordaqa/catalog'
import { OXFORD_AQA_QUALIFICATIONS } from '@/lib/oxfordaqa/catalog'
import {
  oxfordaqaQualificationPath,
  oxfordaqaRootPath,
  oxfordaqaSubjectBoundariesPath,
  oxfordaqaSubjectPastPapersPath,
  oxfordaqaSubjectPath,
} from '@/lib/seo/oxfordaqa-graph'

export function buildOxfordaqaHubCopy() {
  return {
    title: 'OxfordAQA International — A-level & International GCSE',
    description:
      'OxfordAQA International A-level hubs on MarkScheme: paper maps, grade boundaries and past-paper indexes for Maths, Physics, Chemistry and Biology — built for examiner-style marking.',
    path: oxfordaqaRootPath(),
    keywords: [
      'OxfordAQA',
      'OxfordAQA International A-level',
      'OxfordAQA past papers',
      'OxfordAQA mark scheme',
      'OxfordAQA Mathematics',
    ],
  }
}

export function buildOxfordaqaQualificationCopy(qualificationSlug: string) {
  const qual = OXFORD_AQA_QUALIFICATIONS.find((q) => q.slug === qualificationSlug)
  if (!qual) return null
  return {
    title: `OxfordAQA ${qual.label} — subjects, papers & marking`,
    description: `${qual.blurb} Browse subject hubs for paper structure, past papers and grade boundaries.`,
    path: oxfordaqaQualificationPath(qual.slug),
    keywords: [
      `OxfordAQA ${qual.label}`,
      'OxfordAQA mark scheme',
      'OxfordAQA past papers',
    ],
  }
}

export function buildOxfordaqaSubjectCopy(subject: OxfordaqaSubject) {
  const qual = OXFORD_AQA_QUALIFICATIONS.find((q) => q.slug === subject.qualification)
  const qualLabel = qual?.label ?? 'International A-level'
  return {
    title: `OxfordAQA ${subject.name} — papers, past papers & marking`,
    description: subject.blurb,
    path: oxfordaqaSubjectPath(subject.qualification, subject.slug),
    pastPapersPath: oxfordaqaSubjectPastPapersPath(subject.qualification, subject.slug),
    boundariesPath: oxfordaqaSubjectBoundariesPath(subject.qualification, subject.slug),
    keywords: [
      `OxfordAQA ${subject.name}`,
      `OxfordAQA International A-level ${subject.name}`,
      `OxfordAQA ${subject.name} past papers`,
      `OxfordAQA ${subject.name} mark scheme`,
      qualLabel,
    ],
  }
}
