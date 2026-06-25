import { JsonLd } from '@/components/seo/JsonLd'
import {
  breadcrumbList,
  faqPageNode,
  howToNode,
  itemListNode,
  learningResourceNode,
  organizationNode,
  webPageNode,
  websiteNode,
} from '@/lib/seo/structured-data'
import { buildIbCourseLessonFaqs } from '@/lib/seo/ib-course-seo'
import { SITE_URL } from '@/lib/site-config'
import type { CourseLesson } from '@/lib/courses/types'
import type { IbSubject } from '@/lib/ib/catalog'
import { ibCourseContentSlug, ibCourseLessonPath, ibCoursePath } from '@/lib/ib/slug-resolve'

type Props = {
  subject: IbSubject
  lesson: CourseLesson
  seoTitle: string
  seoDescription: string
  topics?: string[]
}

export function IbCourseLessonJsonLd({
  subject,
  lesson,
  seoTitle,
  seoDescription,
  topics,
}: Props) {
  const path = ibCourseLessonPath(subject.slug, lesson.slug)
  const url = `${SITE_URL}${path}`
  const faqs = buildIbCourseLessonFaqs(subject, lesson)
  const level =
    subject.groupNumber === 7
      ? 'Core'
      : subject.level === 'HL'
        ? 'Higher Level'
        : 'Standard Level'

  const courseNode = {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: `IB ${subject.name} — ${lesson.title}`,
    description: seoDescription,
    url,
    isAccessibleForFree: true,
    inLanguage: 'en-GB',
    provider: { '@id': `${SITE_URL}/#organization` },
    educationalLevel: level,
    teaches: topics?.length ? [...topics, lesson.title] : lesson.title,
    ...(lesson.updated ? { dateModified: `${lesson.updated}T12:00:00.000Z` } : {}),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${lesson.durationMin}M`,
    },
  }

  const graphs: Record<string, unknown>[] = [
    organizationNode(),
    websiteNode(),
    webPageNode({ path, name: seoTitle, description: seoDescription }),
    breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'IB courses', path: '/ib/courses' },
      { name: `${subject.name} ${subject.level}`, path: ibCoursePath(subject.slug) },
      { name: lesson.title, path },
    ]),
    courseNode,
    learningResourceNode({
      name: `IB ${subject.name}: ${lesson.title} (${lesson.topicCode})`,
      description: seoDescription,
      url,
      syllabusCode: `ib-${ibCourseContentSlug(subject.slug)}`,
      topics: topics?.length ? topics : undefined,
      level,
    }),
  ]

  if (lesson.learningObjectives?.length) {
    graphs.push(
      itemListNode({
        name: `Learning objectives for ${lesson.title}`,
        items: lesson.learningObjectives.map((name) => ({ name })),
      })
    )
  }

  if (lesson.simpleExplanation?.steps?.length) {
    graphs.push(
      howToNode({
        name: `How to revise ${lesson.title} (IB ${subject.name})`,
        description: lesson.simpleExplanation.summary,
        url,
        steps: lesson.simpleExplanation.steps.map((text, i) => ({
          name: `Step ${i + 1}`,
          text,
        })),
      })
    )
  }

  if (faqs.length >= 2) {
    graphs.push(faqPageNode(faqs))
  }

  return <JsonLd data={graphs} />
}
