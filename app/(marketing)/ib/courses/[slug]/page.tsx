import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getIbCourse, getIbCourseLessons, getIbCourseSlugs } from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { CourseHubClient } from '@/components/courses/margin-notes/CourseHubClient'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
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
  return createPageMetadata({
    title: `IB ${subject.name} ${subject.level} — Free Course`,
    description: `A free IB Diploma ${subject.name} ${subject.level} course: ${course.lessonCount} topic-by-topic lessons with worked examples, markband tips and flashcards. From MarkScheme.`,
    path: course.path,
    keywords: [
      `IB ${subject.name} ${subject.level}`,
      `IB ${subject.name} notes`,
      `IB ${subject.name} course`,
      `IB ${subject.name} revision`,
      `free IB ${subject.name} ${subject.level}`,
    ],
  })
}

export default async function IbCoursePage({ params }: Props) {
  const { slug } = await params
  const course = getIbCourse(slug)
  const subject = getIbSubject(slug)
  if (!course || !subject) notFound()

  const lessons = getIbCourseLessons(slug)
  const communityOn = isCommunityEnabled()

  return (
    <>
      <PageJsonLd
        path={course.path}
        title={`IB ${subject.name} ${subject.level} free course`}
        description={`Topic-by-topic IB ${subject.name} ${subject.level} lessons.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: `${subject.name} ${subject.level}`, path: `/ib/subjects/${slug}` },
          { name: 'Course', path: course.path },
        ]}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <HubSeoIntro
          heading={`Free IB ${subject.name} ${subject.level} course`}
          paragraph={`Every ${subject.name} topic, taught from the ground up with worked examples, markband tips and flashcards — built for the current IB syllabus. Work through it topic by topic, then practise past papers.`}
          links={[
            { href: `/ib/subjects/${slug}`, label: `${subject.name} past papers`, variant: 'muted' },
            { href: '/mark', label: 'Get feedback on your answer →', variant: 'primary' },
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
        coursesCrumb={{ label: 'IB', href: '/ib' }}
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
