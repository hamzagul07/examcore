import { getPageMetadata } from '@/lib/seo/page-meta'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { buildContinueCatalog } from '@/lib/courses/margin-notes/continue-catalog'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { itemListNode } from '@/lib/seo/structured-data'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'
import { SITE_URL } from '@/lib/site-config'
import { CourseCatalogClient } from '@/components/courses/margin-notes/CourseCatalogClient'

export const metadata = getPageMetadata('/courses')

export default function CoursesIndexPage() {
  const catalog = getCourseCatalog()
  const subjects = adaptAllCatalogSubjects(catalog)
  const continueCatalog = buildContinueCatalog()

  return (
    <>
      <PageJsonLd
        path="/courses"
        title="Free Cambridge courses"
        description="Syllabus-aligned free courses for Cambridge International A-Level and O-Level subjects."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Free courses', path: '/courses' },
        ]}
      />
      <JsonLd
        data={itemListNode({
          name: 'Free Cambridge International courses by subject',
          description:
            'Topic-by-topic free courses for Cambridge A-Level and O-Level syllabuses with past-paper marking.',
          items: catalog.map((course) => {
            const profile = getSubjectSeoProfile(course.code)
            return {
              name: `${course.name} (${course.code})`,
              url: `${SITE_URL}${course.path}`,
              description:
                profile?.courseDescription.replace('{count}', String(course.lessonCount)) ??
                `Free ${course.name} ${course.code} course`,
            }
          }),
        })}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <HubSeoIntro
          heading="Free Cambridge courses — every syllabus topic"
          paragraph="Browse free A-Level and O-Level courses aligned to Cambridge International syllabuses. Each subject is broken into official topic codes with visual lessons, exam tips, and links to past-paper marking — 100% free."
          links={[
            { href: '/subjects', label: 'Browse subjects', variant: 'muted' },
            { href: '/mark', label: 'Mark a past paper →', variant: 'primary' },
          ]}
        />
      </div>
      <CourseCatalogClient subjects={subjects} continueCatalog={continueCatalog} />
    </>
  )
}
