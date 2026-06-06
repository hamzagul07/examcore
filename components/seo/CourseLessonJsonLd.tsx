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
import { buildCourseLessonFaqs } from '@/lib/courses/seo'
import { SITE_URL } from '@/lib/site-config'
import type { CourseLesson } from '@/lib/courses/types'

type Props = {
  subjectCode: string
  subjectName: string
  level: string
  lesson: CourseLesson
  seoTitle: string
  seoDescription: string
}

export function CourseLessonJsonLd({
  subjectCode,
  subjectName,
  level,
  lesson,
  seoTitle,
  seoDescription,
}: Props) {
  const url = `${SITE_URL}/courses/${subjectCode}/${lesson.slug}`
  const faqs = buildCourseLessonFaqs({ code: subjectCode, name: subjectName, level }, lesson)

  const courseNode = {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: `Cambridge ${level} ${subjectName} (${subjectCode}) — ${lesson.title}`,
    description: seoDescription,
    url,
    isAccessibleForFree: true,
    inLanguage: 'en-GB',
    provider: { '@id': `${SITE_URL}/#organization` },
    educationalLevel: level,
    teaches: lesson.title,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${lesson.durationMin}M`,
    },
  }

  const graphs: Record<string, unknown>[] = [
    organizationNode(),
    websiteNode(),
    webPageNode({ path: `/courses/${subjectCode}/${lesson.slug}`, name: seoTitle, description: seoDescription }),
    breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Free courses', path: '/courses' },
      { name: `${subjectName} ${subjectCode}`, path: `/courses/${subjectCode}` },
      { name: lesson.title, path: `/courses/${subjectCode}/${lesson.slug}` },
    ]),
    courseNode,
    learningResourceNode({
      name: `${subjectName} ${subjectCode}: ${lesson.title} (${lesson.topicCode})`,
      description: seoDescription,
      url,
      syllabusCode: subjectCode,
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
        name: `How to revise ${lesson.title} (${subjectCode})`,
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
