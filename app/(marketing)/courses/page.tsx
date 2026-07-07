import { getPageMetadata } from '@/lib/seo/page-meta'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { buildContinueCatalog } from '@/lib/courses/margin-notes/continue-catalog'
import { getIbCatalogCards } from '@/lib/courses/ib-catalog-display.server'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'
import { itemListNode } from '@/lib/seo/structured-data'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'
import { SITE_URL } from '@/lib/site-config'
import { CourseCatalogClient } from '@/components/courses/margin-notes/CourseCatalogClient'

export const metadata = getPageMetadata('/courses')

export default function CoursesIndexPage() {
  const catalog = getCourseCatalog()
  const subjects = adaptAllCatalogSubjects(catalog)
  const continueCatalog = buildContinueCatalog()
  const ibSubjects = getIbCatalogCards()

  const jsonLdItems = [
    ...catalog.map((course) => {
      const profile = getSubjectSeoProfile(course.code)
      return {
        name: `${course.name} (${course.code})`,
        url: `${SITE_URL}${course.path}`,
        description:
          profile?.courseDescription.replace('{count}', String(course.lessonCount)) ??
          `Free ${course.name} ${course.code} course`,
      }
    }),
    ...ibSubjects.map((course) => ({
      name: `${course.name} (IB)`,
      url: `${SITE_URL}${course.href}`,
      description: `Free IB Diploma ${course.name} course with criterion-based practice marking`,
    })),
  ]

  return (
    <>
      <PageJsonLd
        path="/courses"
        title="Free Cambridge & IB courses"
        description="Syllabus-aligned free courses for Cambridge International A-Level, O-Level, and IB Diploma subjects."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Free courses', path: '/courses' },
        ]}
      />
      <JsonLd
        data={itemListNode({
          name: 'Free Cambridge & IB courses by subject',
          description:
            'Topic-by-topic free courses for Cambridge A-Level, O-Level, and IB Diploma syllabuses with past-paper and criterion marking.',
          items: jsonLdItems,
        })}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <MarketingBreadcrumbs
          items={[
            { name: 'Home', path: '/' },
            { name: 'Free courses', path: '/courses' },
          ]}
          className="mb-4"
        />
        <HubSeoIntro
          headingLevel="h1"
          heading="Free courses — Cambridge & IB, every syllabus topic"
          paragraph="Browse free A-Level, O-Level, and IB Diploma courses aligned to official syllabuses. Each subject is broken into topic codes with visual lessons, exam tips, and marking — Cambridge past papers or IB criterion practice — 100% free."
          links={[
            { href: '/courses/2281', label: '2281 Economics course', variant: 'ghost' },
            { href: '/courses/7115', label: '7115 Business course', variant: 'ghost' },
            { href: '/subjects', label: 'Browse subjects', variant: 'muted' },
            { href: '/blog/browse/cambridge', label: 'Cambridge guides by subject', variant: 'muted' },
            { href: '/ib', label: 'IB hub', variant: 'muted' },
            { href: '/community', label: 'Exam Room community', variant: 'muted' },
            { href: '/mark', label: 'Mark a past paper →', variant: 'primary' },
          ]}
        />
      </div>
      <CourseCatalogClient
        subjects={subjects}
        continueCatalog={continueCatalog}
        ibSubjects={ibSubjects}
      />
    </>
  )
}
