import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllIbCourseLessonParams,
  getIbCourse,
  getIbCourseLesson,
  getIbCourseLessons,
} from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { CourseLessonClient } from '@/components/courses/margin-notes/CourseLessonClient'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'

type Props = { params: Promise<{ slug: string; lesson: string[] }> }

export function generateStaticParams() {
  return getAllIbCourseLessonParams().map(({ slug, lesson }) => ({ slug, lesson: [lesson] }))
}

export async function generateMetadata({ params }: Props) {
  const { slug, lesson } = await params
  const subject = getIbSubject(slug)
  const l = getIbCourseLesson(slug, lesson[lesson.length - 1] ?? '')
  if (!subject || !l) return {}
  return createPageMetadata({
    title: `${l.title} — IB ${subject.name} ${subject.level}`,
    description: l.summary || `Learn ${l.title} for IB ${subject.name} ${subject.level} — worked examples, markband tips and flashcards.`,
    path: `/ib/courses/${slug}/${l.slug}`,
    keywords: [
      `IB ${subject.name} ${l.title}`,
      `${l.title} IB ${subject.name}`,
      `IB ${subject.name} ${subject.level} notes`,
    ],
    ogType: 'article',
  })
}

export default async function IbLessonPage({ params }: Props) {
  const { slug, lesson } = await params
  const subject = getIbSubject(slug)
  const course = getIbCourse(slug)
  const lessonSlug = lesson[lesson.length - 1] ?? ''
  const l = getIbCourseLesson(slug, lessonSlug)
  if (!subject || !course || !l) notFound()

  const lessons = getIbCourseLessons(slug)
  const enriched = enrichLessonVisual(slug, l)
  const url = `${SITE_URL}/ib/courses/${slug}/${l.slug}`
  const communityOn = isCommunityEnabled()

  return (
    <>
      <PageJsonLd
        path={`/ib/courses/${slug}/${l.slug}`}
        title={`${l.title} — IB ${subject.name} ${subject.level}`}
        description={l.summary}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: `${subject.name} ${subject.level}`, path: `/ib/subjects/${slug}` },
          { name: 'Course', path: `/ib/courses/${slug}` },
          { name: l.title, path: `/ib/courses/${slug}/${l.slug}` },
        ]}
      />
      <JsonLd
        data={[
          learningResourceNode({
            name: `IB ${subject.name} ${subject.level}: ${l.title}`,
            description: l.summary,
            url,
            syllabusCode: slug,
            topics: [`IB ${subject.name}`, l.title],
            level:
              subject.groupNumber === 7
                ? 'Core'
                : subject.level === 'HL'
                  ? 'Higher Level'
                  : 'Standard Level',
          }),
          ...(l.faq && l.faq.length >= 2 ? [faqPageNode(l.faq.map((f) => ({ q: f.q, a: f.a })))] : []),
        ]}
      />
      <CourseLessonClient
        subjectCode={slug}
        subjectName={subject.name}
        lesson={l}
        enriched={enriched}
        pastPaperQuestions={[]}
        lessons={lessons}
        paperQuery={null}
        basePath="/ib/courses"
        coursesCrumb={{ label: 'IB', href: '/ib' }}
        community={
          communityOn ? (
            <div className="lesson-community">
              <CommunityEntry
                subjectCode={slug}
                title={`Discuss ${l.title}`}
              />
            </div>
          ) : null
        }
      />
    </>
  )
}
