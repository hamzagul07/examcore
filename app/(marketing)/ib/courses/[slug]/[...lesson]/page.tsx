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
import { buildIbCourseLessonSeo, buildIbCourseSubjectSeo } from '@/lib/seo/ib-course-seo'
import { CourseLessonClient } from '@/components/courses/margin-notes/CourseLessonClient'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { IbCourseLessonJsonLd } from '@/components/seo/IbCourseLessonJsonLd'
import { ibShortName } from '@/lib/seo/ib-seo'

type Props = { params: Promise<{ slug: string; lesson: string[] }> }

export function generateStaticParams() {
  return getAllIbCourseLessonParams().map(({ slug, lesson }) => ({ slug, lesson: [lesson] }))
}

export async function generateMetadata({ params }: Props) {
  const { slug, lesson } = await params
  const subject = getIbSubject(slug)
  const l = getIbCourseLesson(slug, lesson[lesson.length - 1] ?? '')
  if (!subject || !l) return {}
  const seo = buildIbCourseLessonSeo(subject, l)
  const subjectSeo = buildIbCourseSubjectSeo(subject, getIbCourseLessons(slug).length)
  const modified = l.updated ? `${l.updated}T12:00:00.000Z` : undefined

  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/ib/courses/${slug}/${l.slug}`,
    keywords: seo.keywords,
    ogImagePath: subjectSeo.ogImagePath,
    ogType: 'article',
    publishedTime: modified,
    modifiedTime: modified,
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
  const seo = buildIbCourseLessonSeo(subject, l)
  const subjectSeo = buildIbCourseSubjectSeo(subject, lessons.length)
  const short = ibShortName(subject)
  const communityOn = isCommunityEnabled()

  return (
    <>
      <IbCourseLessonJsonLd
        subject={subject}
        lesson={l}
        seoTitle={seo.title}
        seoDescription={seo.description}
        topics={subjectSeo.topics}
      />

      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-4 sm:px-6">
        <CourseLessonSeoIntro
          heading={seo.introHeading}
          paragraph={seo.introParagraph}
          subjectCode={slug}
          subjectName={subject.name}
          markPath={seo.markPath}
          courseHref={`/ib/courses/${slug}`}
          subjectHubHref={`/ib/subjects/${slug}`}
          markCtaLabel="IB criterion practice"
          courseCtaLabel={`Full IB ${short} course`}
          subjectHubCtaLabel={`${short} subject hub`}
        />
      </div>

      <CourseLessonClient
        subjectCode={slug}
        subjectName={subject.name}
        lesson={l}
        enriched={enriched}
        pastPaperQuestions={[]}
        lessons={lessons}
        paperQuery={null}
        basePath="/ib/courses"
        coursesCrumb={{ label: 'IB courses', href: '/ib/courses' }}
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
