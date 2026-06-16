import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { buildContinueCatalog } from '@/lib/courses/margin-notes/continue-catalog'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { CourseCatalogClient } from '@/components/courses/margin-notes/CourseCatalogClient'

export const metadata = createPageMetadata({
  title: 'Free Cambridge A-Level & O-Level courses — topic by topic',
  description:
    'Free syllabus-aligned courses for Cambridge A-Level and O-Level. Learn every topic step by step, then practise past papers with real mark scheme marking on MarkScheme.',
  path: '/courses',
  keywords: [
    'free A Level course',
    'free Cambridge notes',
    'ZNotes alternative',
    'A Level revision free',
    'Cambridge syllabus topics',
    '9709 course free',
  ],
})

export default function CoursesIndexPage() {
  const subjects = adaptAllCatalogSubjects(getCourseCatalog())
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
      <CourseCatalogClient subjects={subjects} continueCatalog={continueCatalog} />
    </>
  )
}
