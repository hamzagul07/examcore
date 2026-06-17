import { JsonLd } from '@/components/seo/JsonLd'
import {
  breadcrumbList,
  itemListNode,
  organizationNode,
  webPageNode,
  websiteNode,
} from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import type { CourseLesson } from '@/lib/courses/types'

type Props = {
  subjectCode: string
  subjectName: string
  level: string
  description: string
  lessons: CourseLesson[]
  topics?: string[]
}

export function CourseSubjectJsonLd({
  subjectCode,
  subjectName,
  level,
  description,
  lessons,
  topics,
}: Props) {
  const path = `/courses/${subjectCode}`
  const title = `Free Cambridge ${level} ${subjectName} (${subjectCode}) course`

  return (
    <JsonLd
      data={[
        organizationNode(),
        websiteNode(),
        webPageNode({ path, name: title, description }),
        breadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Free courses', path: '/courses' },
          { name: `${subjectName} ${subjectCode}`, path },
        ]),
        {
          '@type': 'Course',
          '@id': `${SITE_URL}${path}#course`,
          name: title,
          description,
          url: `${SITE_URL}${path}`,
          isAccessibleForFree: true,
          inLanguage: 'en-GB',
          provider: { '@id': `${SITE_URL}/#organization` },
          educationalLevel: level,
          numberOfCredits: lessons.length,
          teaches: topics?.length ? topics : `${subjectName} syllabus ${subjectCode}`,
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
          },
        },
        itemListNode({
          name: `${subjectCode} syllabus topics`,
          items: lessons.map((l) => ({
            name: `${l.topicCode} ${l.title}`,
            url: `${SITE_URL}/courses/${subjectCode}/${l.slug}`,
          })),
        }),
      ]}
    />
  )
}
