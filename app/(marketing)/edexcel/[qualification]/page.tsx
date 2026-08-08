import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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

  const subjects =
    qualification === 'international-a-level'
      ? getEdexcelSubjects('international-a-level')
      : []

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
            International GCSE subject hubs are next — IAL Mathematics, Physics,
            Chemistry and Biology are live first so we can prove marking conversion
            before growing the catalogue.
          </p>
        ) : (
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {subjects.map((s) => (
              <li key={s.slug}>
                <Link
                  href={edexcelSubjectPath(s.qualification, s.slug)}
                  className="ec-card flex h-full items-center justify-between gap-3 p-4"
                >
                  <span>
                    <span className="font-semibold">{s.name}</span>
                    <span className="ms-micro mt-1 block uppercase tracking-wide">
                      {s.units.length} units · {s.familyCode}
                    </span>
                    <span className="ms-body-2 mt-2 block line-clamp-3">{s.blurb}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </MarketingSection>

      {qualification === 'international-gcse' && (
        <MarketingSection>
          <h2 className="ms-h2">Also available</h2>
          <ul className="list-none p-0">
            {EDEXCEL_QUALIFICATIONS.filter((q) => q.slug === 'international-a-level').map(
              (q) => (
                <li key={q.slug}>
                  <Link href={`/edexcel/${q.slug}`} className="ms-body-2 underline">
                    Browse {q.label} subjects
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
