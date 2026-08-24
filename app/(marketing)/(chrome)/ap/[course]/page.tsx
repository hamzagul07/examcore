import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { CrossBoardTopicLinks } from '@/components/seo/CrossBoardTopicLinks'
import { ApSubjectStudyPath } from '@/components/seo/ApSubjectStudyPath'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getApCourse, getApCourses } from '@/lib/ap/catalog'
import { apMarkHref } from '@/lib/ap/marking'
import { apCoursePath, apRootPath, apScoreCalculatorPath } from '@/lib/seo/ap-graph'
import { verifiedCourseLessonsForApSubject } from '@/lib/curriculum-graph/verified-course-links'

type Props = { params: Promise<{ course: string }> }

export function generateStaticParams() {
  return getApCourses().map((c) => ({ course: c.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { course: slug } = await params
  const course = getApCourse(slug)
  if (!course) return {}
  return createPageMetadata({
    title: `AP ${course.name} — FRQ marking`,
    description: course.blurb,
    path: apCoursePath(course.slug),
    keywords: [`AP ${course.name}`, 'AP FRQ', course.contentCode],
  })
}

export default async function ApCoursePage({ params }: Props) {
  const { course: slug } = await params
  const course = getApCourse(slug)
  if (!course) notFound()
  const markHref = apMarkHref(course.contentCode)
  const path = apCoursePath(course.slug)
  const studyLessons = verifiedCourseLessonsForApSubject(course.contentCode)
  const markingLive = course.markingEnabled

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`AP ${course.name}`}
        description={course.blurb}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AP', path: apRootPath() },
          { name: course.name, path },
        ]}
      />
      <MarketingHero
        label={`AP · ${course.contentCode}`}
        title={course.name}
        lead={
          studyLessons.length > 0
            ? `Free mapped visual lessons for AP ${course.name}, then mark with FRQ scoring guidelines — not an A-Level dialect.`
            : course.blurb
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {studyLessons.length > 0 ? (
            <a
              href="#ap-study-path-h"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              Start study path -&gt;
            </a>
          ) : null}
          {markingLive ? (
            <Link
              href={markHref}
              className={
                studyLessons.length > 0
                  ? 'ec-btn-ghost inline-flex min-h-[48px] items-center gap-2'
                  : 'ec-btn-primary inline-flex min-h-[48px] items-center gap-2'
              }
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                FRQ
              </span>
              Mark AP {course.name} -&gt;
            </Link>
          ) : null}
          <Link
            href={apScoreCalculatorPath()}
            className="ec-btn-ghost inline-flex min-h-[48px] items-center"
          >
            Score calculator (soon)
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <ApSubjectStudyPath
          contentCode={course.contentCode}
          courseName={course.name}
          markHref={markHref}
          lessons={studyLessons}
        />

        <CrossBoardTopicLinks mode="ap-subject" contentCode={course.contentCode} />

        <h2 className="ms-h2 mt-10">FRQ desk</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
          {markingLive
            ? `Practice FRQs for AP ${course.name}. Use the study path above for mapped visuals first.`
            : 'Shell only — marking for this course is not live yet.'}
        </p>
        <ul className="ms-board-index">
          {markingLive ? (
            <li>
              <Link href={markHref} className="ms-board-slip">
                <span className="ms-board-slip__code">FRQ</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">Mark with scoring guidelines</span>
                  <span className="ms-board-slip__blurb">
                    Earned / not-earned points — not A-Level M/A dialect.
                  </span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
