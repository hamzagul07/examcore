import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { SubjectsDirectoryClient } from '@/components/courses/margin-notes/SubjectsDirectoryClient'

export const metadata = getPageMetadata('/subjects', {
  keywords: ['9709 past papers', '9708 economics', 'Cambridge subject codes', 'O-Level 4024'],
})

export default function SubjectsPage() {
  const subjects = adaptAllCatalogSubjects(getCourseCatalog())

  return (
    <>
      <PageJsonLd
        path="/subjects"
        title="Cambridge subjects — past paper marking"
        description="MarkScheme supports Cambridge International past papers across A-Level and O-Level syllabuses."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Subjects', path: '/subjects' },
        ]}
      />
      <SubjectsDirectoryClient subjects={subjects} />
    </>
  )
}
