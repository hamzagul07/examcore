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
  OXFORD_AQA_QUALIFICATIONS,
  getOxfordaqaQualification,
  getOxfordaqaSubjects,
} from '@/lib/oxfordaqa/catalog'
import {
  getAllOxfordaqaQualificationParams,
  oxfordaqaRootPath,
  oxfordaqaSubjectPath,
} from '@/lib/seo/oxfordaqa-graph'
import { buildOxfordaqaQualificationCopy } from '@/lib/seo/oxfordaqa-seo'

type Props = { params: Promise<{ qualification: string }> }

export function generateStaticParams() {
  return getAllOxfordaqaQualificationParams()
}

export async function generateMetadata({ params }: Props) {
  const { qualification } = await params
  const copy = buildOxfordaqaQualificationCopy(qualification)
  if (!copy) return {}
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
  })
}

function subjectStamp(slug: string) {
  return slug.slice(0, 4).toUpperCase()
}

export default async function OxfordaqaQualificationPage({ params }: Props) {
  const { qualification } = await params
  const qual = getOxfordaqaQualification(qualification)
  if (!qual?.shellEnabled) notFound()
  const copy = buildOxfordaqaQualificationCopy(qualification)
  if (!copy) notFound()

  const subjects =
    qualification === 'international-a-level'
      ? getOxfordaqaSubjects('international-a-level')
      : []

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: qual.label, path: copy.path },
        ]}
      />
      <MarketingHero
        label={`OxfordAQA · ${qual.shortLabel}`}
        title={qual.label}
        lead={qual.blurb}
      />

      <MarketingSection>
        <h2 className="ms-h2">Subjects</h2>
        {subjects.length === 0 ? (
          <p className="ms-body-2 text-[var(--ec-text-secondary)]">
            International GCSE subject hubs follow after IAL Maths/Physics/Chemistry
            conversion. Browse{' '}
            <Link href="/oxfordaqa/international-a-level" className="ec-link">
              International A-level
            </Link>{' '}
            for now.
          </p>
        ) : (
          <ul className="ms-board-index">
            {subjects.map((s) => (
              <li key={s.slug}>
                <Link
                  href={oxfordaqaSubjectPath(s.qualification, s.slug)}
                  className="ms-board-slip"
                >
                  <span className="ms-board-slip__code">{subjectStamp(s.slug)}</span>
                  <span className="ms-board-slip__body">
                    <span className="ms-board-slip__name">{s.name}</span>
                    <span className="ms-board-slip__meta">
                      {s.papers.length} papers · Wave {s.markingWave}
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
            {OXFORD_AQA_QUALIFICATIONS.filter(
              (q) => q.slug === 'international-a-level'
            ).map((q) => (
              <li key={q.slug}>
                <Link
                  href={`/oxfordaqa/${q.slug}`}
                  className="ms-board-slip ms-board-slip--compact"
                >
                  <span className="ms-board-slip__code">{q.shortLabel}</span>
                  <span className="ms-board-slip__body">
                    <span className="ms-board-slip__name">Browse {q.label} subjects</span>
                  </span>
                  <span className="ms-board-slip__go" aria-hidden>
                    -&gt;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </MarketingSection>
      )}
    </MarketingPageShell>
  )
}
