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
import type { IbSubject } from '@/lib/ib/catalog'
import { ibCourseLessonPath, ibCoursePath } from '@/lib/ib/slug-resolve'
import { ibShortName } from '@/lib/seo/ib-seo'

type Props = {
  subject: IbSubject
  description: string
  lessons: CourseLesson[]
  topics?: string[]
}

export function IbCourseSubjectJsonLd({ subject, description, lessons, topics }: Props) {
  const path = ibCoursePath(subject.slug)
  const short = ibShortName(subject)
  const level =
    subject.groupNumber === 7
      ? 'Core'
      : subject.level === 'HL'
        ? 'Higher Level'
        : 'Standard Level'
  const levelLabel = subject.groupNumber === 7 ? 'Core' : subject.level
  const title = `Free IB ${short} ${levelLabel} course`

  return (
    <JsonLd
      data={[
        organizationNode(),
        websiteNode(),
        webPageNode({ path, name: title, description }),
        breadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'IB courses', path: '/ib/courses' },
          { name: `${subject.name} ${subject.level}`, path },
        ]),
        {
          '@type': 'Course',
          '@id': `${SITE_URL}${path}#course`,
          name: `Free IB Diploma ${subject.name} course`,
          description,
          url: `${SITE_URL}${path}`,
          isAccessibleForFree: true,
          inLanguage: 'en-GB',
          provider: { '@id': `${SITE_URL}/#organization` },
          educationalLevel: level,
          numberOfCredits: lessons.length,
          teaches: topics?.length ? topics : `IB ${subject.name} syllabus`,
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
          },
        },
        itemListNode({
          name: `IB ${subject.name} syllabus topics`,
          items: lessons.map((l) => ({
            name: `${l.topicCode} ${l.title}`,
            url: `${SITE_URL}${ibCourseLessonPath(subject.slug, l.slug)}`,
          })),
        }),
      ]}
    />
  )
}
