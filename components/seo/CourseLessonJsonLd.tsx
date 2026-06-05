import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, learningResourceNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import type { CourseLesson } from '@/lib/courses/types'

type Props = {
  subjectCode: string
  subjectName: string
  level: string
  lesson: CourseLesson
}

export function CourseLessonJsonLd({ subjectCode, subjectName, level, lesson }: Props) {
  const url = `${SITE_URL}/courses/${subjectCode}/${lesson.slug}`

  const courseNode = {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: `Free Cambridge ${level} ${subjectName} (${subjectCode}) — ${lesson.title}`,
    description: lesson.summary,
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

  const graphs = [
    courseNode,
    learningResourceNode({
      name: `${subjectName}: ${lesson.title}`,
      description: lesson.summary,
      url,
      syllabusCode: subjectCode,
    }),
  ]

  if (lesson.faq && lesson.faq.length >= 2) {
    graphs.push(faqPageNode(lesson.faq))
  }

  return <JsonLd data={graphs} />
}
