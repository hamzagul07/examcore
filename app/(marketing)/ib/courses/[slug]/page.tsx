import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getIbCourse, getIbCourseLessons, getIbCourseSlugs } from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { buildIbCourseHubIntro, buildIbCourseSubjectSeo } from '@/lib/seo/ib-course-seo'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { CourseHubClient } from '@/components/courses/margin-notes/CourseHubClient'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { IbCourseSubjectJsonLd } from '@/components/seo/IbCourseSubjectJsonLd'
import { IbLegitResourcesPanel } from '@/components/ib/IbLegitResourcesPanel'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getIbCourseSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const course = getIbCourse(slug)
  const subject = getIbSubject(slug)
  if (!course || !subject) return {}
  const seo = buildIbCourseSubjectSeo(subject, course.lessonCount)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: course.path,
    keywords: seo.keywords,
    ogImagePath: seo.ogImagePath,
  })
}

export default async function IbCoursePage({ params }: Props) {
  const { slug } = await params
  const course = getIbCourse(slug)
  const subject = getIbSubject(slug)
  if (!course || !subject) notFound()

  const lessons = getIbCourseLessons(slug)
  const seo = buildIbCourseSubjectSeo(subject, course.lessonCount)
  const intro = buildIbCourseHubIntro(subject, course.lessonCount)
  const communityOn = isCommunityEnabled()

  return (
    <>
      <IbCourseSubjectJsonLd
        subject={subject}
        description={seo.description}
        lessons={lessons}
        topics={seo.topics}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <HubSeoIntro
          heading={intro.heading}
          paragraph={intro.paragraph}
          links={[
            { href: `/ib/subjects/${slug}`, label: `${subject.name} past papers`, variant: 'muted' },
            { href: '/ib/courses', label: 'All IB courses', variant: 'muted' },
            { href: '/mark', label: 'Criterion practice →', variant: 'primary' },
            ...(communityOn
              ? [{ href: `/community/s/${slug}`, label: 'Exam Room community', variant: 'muted' as const }]
              : []),
          ]}
        />
      </div>
      <CourseHubClient
        code={slug}
        name={course.name}
        level={course.level}
        lessons={lessons}
        initialPaperNumber={null}
        basePath="/ib/courses"
        coursesCrumb={{ label: 'IB courses', href: '/ib/courses' }}
        board="ib"
        asideExtra={<IbLegitResourcesPanel slug={slug} />}
        community={
          communityOn ? (
            <div className="hub-community">
              <CommunityEntry
                subjectCode={slug}
                title={`IB ${subject.name} ${subject.level} Exam Room`}
              />
            </div>
          ) : null
        }
      />
    </>
  )
}
