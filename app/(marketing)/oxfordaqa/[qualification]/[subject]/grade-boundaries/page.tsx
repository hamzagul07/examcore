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
  getAllOxfordaqaSubjectParams,
  oxfordaqaRootPath,
  oxfordaqaSubjectPath,
  resolveOxfordaqaSubject,
} from '@/lib/seo/oxfordaqa-graph'
import { buildOxfordaqaSubjectCopy } from '@/lib/seo/oxfordaqa-seo'

type Props = { params: Promise<{ qualification: string; subject: string }> }

export function generateStaticParams() {
  return getAllOxfordaqaSubjectParams()
}

export async function generateMetadata({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) return {}
  const copy = buildOxfordaqaSubjectCopy(subject)
  return createPageMetadata({
    title: `OxfordAQA ${subject.name} grade boundaries`,
    description: `Grade-boundary hub for OxfordAQA International A-level ${subject.name}.`,
    path: copy.boundariesPath,
    keywords: [
      `OxfordAQA ${subject.name} grade boundaries`,
      'OxfordAQA International A-level boundaries',
    ],
  })
}

export default async function OxfordaqaBoundariesPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const copy = buildOxfordaqaSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.boundariesPath}
        title={`OxfordAQA ${subject.name} grade boundaries`}
        description={`Grade-boundary hub for OxfordAQA ${subject.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: subject.name, path: oxfordaqaSubjectPath(qualification, subjectSlug) },
          { name: 'Grade boundaries', path: copy.boundariesPath },
        ]}
      />
      <MarketingHero
        label={`${subject.name} · Boundaries`}
        title={`${subject.name} grade boundaries`}
        lead="Boundary tables for OxfordAQA sessions will live here. Until then, use the paper list to target revision."
      />
      <MarketingSection>
        <h2 className="ms-h2">Papers in this subject</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-3">
          {subject.papers.map((p) => (
            <li key={p.slug} className="ec-card p-4">
              <span className="font-semibold">{p.name}</span>
            </li>
          ))}
        </ul>
        <p className="ms-body-2 mt-6 text-[var(--ec-text-secondary)]">
          Cambridge boundaries are live on the{' '}
          <Link href="/tools/grade-boundary-calculator" className="underline">
            grade-boundary calculator
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
