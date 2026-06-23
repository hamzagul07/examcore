import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getIbCourse, getIbCourseLessons, getIbCourseSlugs } from '@/lib/courses/ib'
import { getIbSubject } from '@/lib/ib/catalog'
import { buildIbCourseHubIntro, buildIbCourseSubjectSeo } from '@/lib/seo/ib-course-seo'
import { getIbSubjectBlogLinks } from '@/lib/seo/ib-subject-blog'
import { ibShortName } from '@/lib/seo/ib-seo'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { CourseHubClient } from '@/components/courses/margin-notes/CourseHubClient'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { IbCourseSubjectJsonLd } from '@/components/seo/IbCourseSubjectJsonLd'
import { IbLegitResourcesPanel } from '@/components/ib/IbLegitResourcesPanel'
import { getTotalSyllabusLeaves } from '@/lib/syllabi'

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
  const syllabusLeaves = getTotalSyllabusLeaves(`ib-${slug}`)
  const publishingMore = syllabusLeaves > lessons.length
  const blogLinks = getIbSubjectBlogLinks(slug, ibShortName(subject))

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
            ...blogLinks.map((link) => ({
              href: link.href,
              label: link.label,
              variant: 'muted' as const,
            })),
            ...(communityOn
              ? [{ href: `/community/s/${slug}`, label: 'Exam Room community', variant: 'muted' as const }]
              : []),
          ]}
        />
        {publishingMore ? (
          <p
            className="mt-4 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] px-4 py-3 text-sm text-[var(--ec-text-secondary)]"
            role="status"
          >
            <strong className="text-[var(--ec-text-primary)]">Course in progress</strong> —{' '}
            {lessons.length} of {syllabusLeaves} syllabus topics are live. New lessons are added as
            they are published; check back soon for the rest.
          </p>
        ) : null}
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
