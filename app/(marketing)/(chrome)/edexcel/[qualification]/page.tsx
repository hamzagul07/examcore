import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  EDEXCEL_QUALIFICATIONS,
  getEdexcelQualification,
  getEdexcelSubjects,
} from '@/lib/edexcel/catalog'
import {
  edexcelRootPath,
  edexcelSubjectPath,
  getAllEdexcelQualificationParams,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelQualificationCopy } from '@/lib/seo/edexcel-seo'

type Props = { params: Promise<{ qualification: string }> }

export function generateStaticParams() {
  return getAllEdexcelQualificationParams()
}

export async function generateMetadata({ params }: Props) {
  const { qualification } = await params
  const copy = buildEdexcelQualificationCopy(qualification)
  if (!copy) return {}
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
  })
}

export default async function EdexcelQualificationPage({ params }: Props) {
  const { qualification } = await params
  const qual = getEdexcelQualification(qualification)
  if (!qual?.shellEnabled) notFound()

  const copy = buildEdexcelQualificationCopy(qualification)
  if (!copy) notFound()

  const subjects = getEdexcelSubjects(
    qualification as 'international-a-level' | 'international-gcse' | 'a-level'
  )

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: qual.label, path: copy.path },
        ]}
      />
      <MarketingHero
        label={`Edexcel · ${qual.shortLabel}`}
        title={qual.label}
        lead={qual.blurb}
      />

      <MarketingSection>
        <h2 className="ms-h2">Subjects</h2>
        {subjects.length === 0 ? (
          <p className="ms-body-2 text-[var(--ec-text-secondary)]">
            {qualification === 'international-gcse'
              ? 'International GCSE subject hubs are next — IAL and selective UK A Level Maths/Physics are live first.'
              : 'Subject hubs for this qualification are not listed yet.'}
          </p>
        ) : (
          <ul className="ms-board-index">
            {subjects.map((s) => (
              <li key={s.slug}>
                <Link
                  href={edexcelSubjectPath(s.qualification, s.slug)}
                  className="ms-board-slip"
                >
                  <span className="ms-board-slip__code">{s.familyCode}</span>
                  <span className="ms-board-slip__body">
                    <span className="ms-board-slip__name">{s.name}</span>
                    <span className="ms-board-slip__meta">
                      {s.units.length} units · {s.familyCode}
                    </span>
                    <span className="ms-board-slip__blurb">{s.blurb}</span>
                  </span>
                  <span className="ms-board-slip__go" aria-hidden>
                    -&gt;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </MarketingSection>

      {qualification === 'international-gcse' && (
        <MarketingSection>
          <h2 className="ms-h2">Also available</h2>
          <ul className="ms-board-index ms-board-index--guides">
            {EDEXCEL_QUALIFICATIONS.filter((q) => q.slug === 'international-a-level').map(
              (q) => (
                <li key={q.slug}>
                  <Link href={`/edexcel/${q.slug}`} className="ms-board-slip ms-board-slip--compact">
                    <span className="ms-board-slip__code">{q.shortLabel}</span>
                    <span className="ms-board-slip__body">
                      <span className="ms-board-slip__name">Browse {q.label} subjects</span>
                    </span>
                    <span className="ms-board-slip__go" aria-hidden>
                      -&gt;
                    </span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </MarketingSection>
      )}
    </MarketingPageShell>
  )
}
