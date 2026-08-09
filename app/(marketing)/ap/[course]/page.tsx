import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getApCourse, getApCourses } from '@/lib/ap/catalog'
import { apMarkHref } from '@/lib/ap/marking'
import { apCoursePath, apRootPath, apScoreCalculatorPath } from '@/lib/seo/ap-graph'

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
      <MarketingHero label="AP" title={course.name} lead={course.blurb}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={markHref} className="ec-btn-primary inline-flex min-h-[48px] items-center">
            Mark an FRQ -&gt;
          </Link>
          <Link
            href={apScoreCalculatorPath()}
            className="ec-btn-ghost inline-flex min-h-[48px] items-center"
          >
            Score calculator (soon)
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection>
        <ul className="grid list-none gap-3 p-0">
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
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
