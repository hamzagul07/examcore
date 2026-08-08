import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getEdexcelQualification } from '@/lib/edexcel/catalog'
import {
  edexcelRootPath,
  edexcelSubjectPath,
  getAllEdexcelSubjectParams,
  resolveEdexcelSubject,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelSubjectCopy } from '@/lib/seo/edexcel-seo'

type Props = { params: Promise<{ qualification: string; subject: string }> }

export function generateStaticParams() {
  return getAllEdexcelSubjectParams()
}

export async function generateMetadata({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) return {}
  const copy = buildEdexcelSubjectCopy(subject)
  return createPageMetadata({
    title: `Edexcel IAL ${subject.name} past papers`,
    description: `Past-paper index for Edexcel International A Level ${subject.name} (${subject.familyCode}). Organised by unit — ${subject.units.map((u) => u.code).join(', ')}.`,
    path: copy.pastPapersPath,
    keywords: [
      `Edexcel IAL ${subject.name} past papers`,
      `${subject.familyCode} past papers`,
      'Edexcel International A Level past papers',
    ],
  })
}

export default async function EdexcelPastPapersPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()
  const copy = buildEdexcelSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.pastPapersPath}
        title={`Edexcel IAL ${subject.name} past papers`}
        description={`Unit-organised past-paper index for Edexcel IAL ${subject.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: subject.name, path: edexcelSubjectPath(qualification, subjectSlug) },
          { name: 'Past papers', path: copy.pastPapersPath },
        ]}
      />
      <MarketingHero
        label={`${subject.familyCode} · Past papers`}
        title={`${subject.name} past papers`}
        lead={`Edexcel IAL ${subject.name} is modular. Use the unit list below as your paper map — full session archives and in-context marking land with the Maths marking wave.`}
      />
      <MarketingSection>
        <h2 className="ms-h2">Units</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {subject.units.map((u) => (
            <li key={u.code} className="ec-card p-4">
              <span className="font-semibold">{u.code}</span>
              <span className="ms-body-2 mt-1 block">{u.name}</span>
            </li>
          ))}
        </ul>
        <p className="ms-body-2 mt-6 text-[var(--ec-text-secondary)]">
          Prefer Cambridge papers today?{' '}
          <Link href="/past-papers" className="underline">
            Browse CAIE past papers
          </Link>{' '}
          or{' '}
          <Link href="/mark" className="underline">
            mark an answer
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
