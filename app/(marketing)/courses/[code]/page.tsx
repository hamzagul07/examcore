import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getCourseLessons,
  getCourseSubject,
  getCourseSubjectCodes,
} from '@/lib/courses'
import { buildCourseSubjectSeo } from '@/lib/courses/seo'
import { CourseSubjectJsonLd } from '@/components/seo/CourseSubjectJsonLd'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { buildCourseHubIntro } from '@/lib/seo/hub-intro'
import { CourseHubClient } from '@/components/courses/margin-notes/CourseHubClient'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ paper?: string }>
}

export async function generateStaticParams() {
  return getCourseSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const course = getCourseSubject(code)
  if (!course) return {}
  const seo = buildCourseSubjectSeo(course, course.lessonCount)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: course.path,
    keywords: seo.keywords,
    ogImagePath: seo.ogImagePath,
  })
}

export default async function CourseSubjectPage({ params, searchParams }: Props) {
  const { code } = await params
  const { paper } = await searchParams
  const course = getCourseSubject(code)
  if (!course) notFound()

  const lessons = getCourseLessons(code)
  const seo = buildCourseSubjectSeo(course, course.lessonCount)
  const intro = buildCourseHubIntro(course, course.lessonCount, course.publishedCount ?? 0)
  const communityOn = isCommunityEnabled()

  return (
    <>
      <CourseSubjectJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        description={seo.description}
        lessons={lessons}
        topics={seo.topics}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <HubSeoIntro
          heading={intro.heading}
          paragraph={intro.paragraph}
          links={[
            { href: `/subjects/${code}`, label: `${code} past papers`, variant: 'muted' },
            { href: '/mark', label: 'Mark a past paper →', variant: 'primary' },
            ...(communityOn
              ? [{ href: `/community/s/${code}`, label: 'Exam Room community', variant: 'muted' as const }]
              : []),
          ]}
        />
      </div>
      <CourseHubClient
        code={code}
        name={course.name}
        level={course.level}
        lessons={lessons}
        initialPaperNumber={paper ?? null}
        community={
          communityOn ? (
            <div className="hub-community">
              <CommunityEntry subjectCode={code} title={`${course.name} Exam Room`} />
            </div>
          ) : null
        }
      />
    </>
  )
}
