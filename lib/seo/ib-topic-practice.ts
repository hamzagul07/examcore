import { getIbCourseLesson, getIbCourseLessons, getIbCourseSlugs } from '@/lib/courses/ib'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { getIbSubject } from '@/lib/ib/catalog'
import { buildIbTopicPracticePrompt, ibPracticeCriteriaSummary } from '@/lib/ib/practice-prompts'
import { ibShortName } from '@/lib/seo/ib-seo'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'
import { getSyllabusByCode } from '@/lib/syllabi'

export type IbTopicPracticePage = {
  topicCode: string
  topicSlug: string
  title: string
  paper: string
  paperName: string
  lessonSlug: string | null
  practicePrompt: string
  criteriaSummary: string | null
  markHref: string
}

function ibSyllabusCode(catalogSlug: string): string {
  return `ib-${catalogSlug}`
}

function buildPage(
  catalogSlug: string,
  topic: { code: string; name: string; paper: string; paperName: string }
): IbTopicPracticePage {
  const syllabusCode = ibSyllabusCode(catalogSlug)
  const topicSlug = topicToLessonSlug(topic.code, topic.name)
  const lesson = getIbCourseLesson(catalogSlug, topicSlug)
  const markHref = `/mark?subject=${encodeURIComponent(syllabusCode)}&topic=${encodeURIComponent(topic.code)}`

  return {
    topicCode: topic.code,
    topicSlug,
    title: topic.name,
    paper: topic.paper,
    paperName: topic.paperName,
    lessonSlug: lesson?.slug ?? null,
    practicePrompt: buildIbTopicPracticePrompt(syllabusCode, topic.code),
    criteriaSummary: ibPracticeCriteriaSummary(syllabusCode),
    markHref,
  }
}

/** IB subjects with generated courses that have syllabus topic practice pages. */
export function getIbTopicPracticeSubjectSlugs(): string[] {
  return getIbCourseSlugs().filter((slug) => getIbTopicPracticePages(slug).length > 0)
}

export function getIbTopicPracticePages(catalogSlug: string): IbTopicPracticePage[] {
  const topics = getSyllabusByCode(ibSyllabusCode(catalogSlug))
  if (!topics?.length) return []
  const lessons = getIbCourseLessons(catalogSlug)
  if (!lessons.length) return []

  const lessonCodes = new Set(lessons.map((l) => l.topicCode))
  return topics
    .filter((t) => lessonCodes.has(t.code))
    .map((t) => buildPage(catalogSlug, t))
}

export function getIbTopicPracticePage(
  catalogSlug: string,
  topicSlug: string
): IbTopicPracticePage | null {
  return getIbTopicPracticePages(catalogSlug).find((t) => t.topicSlug === topicSlug) ?? null
}

export function getAllIbTopicPracticeParams(): { slug: string; topic: string }[] {
  return getIbTopicPracticeSubjectSlugs().flatMap((slug) =>
    getIbTopicPracticePages(slug).map((t) => ({ slug, topic: t.topicSlug }))
  )
}

export function buildIbTopicPracticeCopy(catalogSlug: string, page: IbTopicPracticePage) {
  const subject = getIbSubject(catalogSlug)
  if (!subject) {
    return {
      short: catalogSlug,
      level: 'IB',
      title: page.title,
      description: page.title,
      path: `/ib/past-papers/${catalogSlug}/${page.topicSlug}`,
      keywords: [] as string[],
    }
  }

  const short = ibShortName(subject)
  const level =
    subject.groupNumber === 7 ? 'Core' : subject.level === 'HL' ? 'Higher Level' : 'Standard Level'
  const title = formatSerpTitle(
    `IB ${short} ${subject.level}: ${page.title} — practice & marking`,
    true
  )
  const description = formatMetaDescription(
    `Revise IB Diploma ${subject.name} ${subject.level} topic ${page.topicCode} (${page.title}). Free lesson, markband tips, and criterion-based practice marking against official IB assessment criteria.`
  )

  return {
    short,
    level,
    title,
    description,
    path: `/ib/past-papers/${catalogSlug}/${page.topicSlug}`,
    keywords: [
      `IB ${subject.name} ${page.title}`,
      `IB ${short} ${page.topicCode}`,
      `${page.title} IB ${subject.level}`,
      `IB ${subject.name} ${page.title} notes`,
      `IB ${short} practice questions`,
      `IB criterion marking ${short}`,
      `IB ${page.title} revision`,
    ],
  }
}
