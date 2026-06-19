import cache from '@/lib/past-paper-topics-cache.json'
import { getSubjectByCode } from '@/lib/profile-options'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { getPastPaperSubject } from '@/lib/seo/past-papers'

export type TopicQuestion = {
  stem: string
  marks: number | null
  sessionLabel: string
  paperCode: string
  questionNumber: string
  markHref: string
}

export type TopicQuestionPage = {
  topicCode: string
  topicSlug: string
  lessonSlug: string
  title: string
  questionCount: number
  questions: TopicQuestion[]
}

type Cache = Record<string, TopicQuestionPage[]>
const CACHE = cache as Cache

/** Subject codes that have at least one topic-question page. */
export function getTopicQuestionSubjectCodes(): string[] {
  return Object.keys(CACHE).filter((code) => (CACHE[code]?.length ?? 0) > 0)
}

export function getTopicQuestionPages(code: string): TopicQuestionPage[] {
  return CACHE[code] ?? []
}

export function getTopicQuestionPage(code: string, topicSlug: string): TopicQuestionPage | null {
  return CACHE[code]?.find((t) => t.topicSlug === topicSlug) ?? null
}

export function getAllTopicQuestionParams(): { code: string; topic: string }[] {
  return Object.entries(CACHE).flatMap(([code, topics]) =>
    topics.map((t) => ({ code, topic: t.topicSlug }))
  )
}

function subjectLabel(code: string): string {
  return getSubjectByCode(code)?.label ?? getCatalogSubject(code)?.name ?? getPastPaperSubject(code)?.label ?? code
}

function subjectLevel(code: string): string {
  return getPastPaperSubject(code)?.level ?? 'Cambridge'
}

export function buildTopicQuestionCopy(code: string, topic: TopicQuestionPage) {
  const label = subjectLabel(code)
  const level = subjectLevel(code)
  const title = `${code} ${label}: ${topic.title} Past Paper Questions`
  const description = `Practise ${topic.questionCount} Cambridge ${level} ${label} (${code}) past-paper questions on ${topic.title}, each marked instantly against the official ${code} mark scheme.`
  return {
    label,
    level,
    title,
    description,
    path: `/past-papers/${code}/${topic.topicSlug}`,
    keywords: [
      `${code} ${topic.title} questions`,
      `${label} ${topic.title} past paper questions`,
      `${code} ${topic.title} exam questions`,
      `${topic.title} ${label} questions`,
      `Cambridge ${code} ${topic.title}`,
    ],
  }
}
