import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { SubjectsCatalogClient } from '@/components/subjects/SubjectsCatalogClient'
import {
  getAllCatalogSubjects,
  getCatalogStats,
  getCatalogSubjects,
} from '@/lib/subjects-catalog'
import { getSubjectGuidePosts } from '@/lib/seo/subject-guides'

export const metadata = getPageMetadata('/subjects', {
  keywords: ['9709 past papers', '9708 economics', 'Cambridge subject codes', 'O-Level 4024'],
})

export default function SubjectsPage() {
  const alevelSubjects = getCatalogSubjects('alevel')
  const olevelSubjects = getCatalogSubjects('olevel')
  const allSubjects = getAllCatalogSubjects()
  const stats = getCatalogStats(allSubjects)
  const guideCount = getSubjectGuidePosts().length

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/subjects"
        title="Cambridge subjects — past paper marking"
        description="MarkScheme supports Cambridge International past papers across A-Level and O-Level syllabuses."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Subjects', path: '/subjects' },
        ]}
      />
      <div className="ms-pg ms-subjects-page">
        <p className="ms-overline">
          Subjects · {stats.syllabi} Cambridge syllabuses
        </p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>
          Pick your paper. <em>We&apos;ve got the scheme.</em>
        </h1>
        <p className="ms-lead">
          Every subject marks against the official Cambridge mark scheme for that
          exact paper and session.
          {guideCount > 0 ? (
            <>
              {' '}
              Each includes a{' '}
              <Link href="/blog" className="underline">
                free revision guide
              </Link>
              .
            </>
          ) : null}
        </p>

        <SubjectsCatalogClient
          alevelSubjects={alevelSubjects}
          olevelSubjects={olevelSubjects}
          stats={stats}
        />
      </div>
    </MarketingPageShell>
  )
}
