import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { itemListNode } from '@/lib/seo/structured-data'
import { getAllSubjectSeoProfiles } from '@/lib/seo/subject-seo'
import { SITE_URL } from '@/lib/site-config'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { SubjectsDirectoryClient } from '@/components/courses/margin-notes/SubjectsDirectoryClient'

export const metadata = getPageMetadata('/subjects', {
  keywords: [
    '9709 past papers',
    '9708 economics',
    '9609 business',
    '9702 physics',
    'Cambridge subject codes',
    'O-Level 4024',
    'A-Level marking by subject',
  ],
})

export default function SubjectsPage() {
  const subjects = adaptAllCatalogSubjects(getCourseCatalog())
  const seoProfiles = getAllSubjectSeoProfiles()

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
      <JsonLd
        data={itemListNode({
          name: 'Cambridge International subjects — past paper marking',
          description:
            'Browse all Cambridge A-Level and O-Level syllabuses supported by MarkScheme for mark-scheme marking.',
          items: seoProfiles.map((p) => ({
            name: `${p.name} (${p.code})`,
            url: `${SITE_URL}/subjects/${p.code}`,
            description: p.markingDescription,
          })),
        })}
      />
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-6 sm:px-6">
        <HubSeoIntro
          heading="Cambridge past paper marking — every syllabus we support"
          paragraph="MarkScheme marks handwritten answers against real Cambridge mark schemes for 24 A-Level and O-Level syllabuses. Choose your subject code, browse past papers, or upload a photo of your working for B1/M1/A1, essay band, or MCQ feedback."
          links={[
            { href: '/courses', label: 'Free courses', variant: 'ghost' },
            { href: '/mark', label: 'Mark now →', variant: 'primary' },
          ]}
        />
      </div>
      <SubjectsDirectoryClient subjects={subjects} />
    </>
  )
}
