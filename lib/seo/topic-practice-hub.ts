import 'server-only'

import { getIbSubject } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'
import {
  getAllIbTopicPracticeParams,
  getIbTopicPracticePages,
  getIbTopicPracticeSubjectSlugs,
} from '@/lib/seo/ib-topic-practice'
import {
  getAllTopicQuestionParams,
  getTopicQuestionPages,
  getTopicQuestionSubjectCodes,
} from '@/lib/seo/topic-questions'
import { getSubjectByCode } from '@/lib/profile-options'

export type CambridgeTopicHubSubject = {
  code: string
  label: string
  topicCount: number
  hubPath: string
  topics: { slug: string; title: string; path: string; questionCount: number }[]
}

export type IbTopicHubSubject = {
  slug: string
  name: string
  level: string
  topicCount: number
  hubPath: string
  topics: { slug: string; title: string; path: string; topicCode: string }[]
}

export function getCambridgeTopicHubSubjects(): CambridgeTopicHubSubject[] {
  return getTopicQuestionSubjectCodes().map((code) => {
    const pages = getTopicQuestionPages(code)
    const label = getSubjectByCode(code)?.label ?? code
    return {
      code,
      label,
      topicCount: pages.length,
      hubPath: `/past-papers/${code}`,
      topics: pages.map((t) => ({
        slug: t.topicSlug,
        title: t.title,
        path: `/past-papers/${code}/${t.topicSlug}`,
        questionCount: t.questionCount,
      })),
    }
  })
}

export function getIbTopicHubSubjects(): IbTopicHubSubject[] {
  return getIbTopicPracticeSubjectSlugs().map((slug) => {
    const subject = getIbSubject(slug)
    const pages = getIbTopicPracticePages(slug)
    const short = subject ? ibShortName(subject) : slug
    return {
      slug,
      name: subject ? `${short} ${subject.level}` : slug,
      level: subject?.level ?? 'IB',
      topicCount: pages.length,
      hubPath: `/ib/past-papers/${slug}`,
      topics: pages.map((t) => ({
        slug: t.topicSlug,
        title: t.title,
        path: `/ib/past-papers/${slug}/${t.topicSlug}`,
        topicCode: t.topicCode,
      })),
    }
  })
}

export function getCambridgeTopicPageCount(): number {
  return getAllTopicQuestionParams().length
}

export function getIbTopicPageCount(): number {
  return getAllIbTopicPracticeParams().length
}
