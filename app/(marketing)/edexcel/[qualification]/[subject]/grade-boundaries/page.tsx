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
    title: `Edexcel IAL ${subject.name} grade boundaries`,
    description: `UMS and raw mark grade-boundary reference for Edexcel International A Level ${subject.name} units (${subject.familyCode}).`,
    path: copy.boundariesPath,
    keywords: [
      `Edexcel IAL ${subject.name} grade boundaries`,
      `${subject.familyCode} UMS`,
      'Edexcel International A Level boundaries',
    ],
  })
}

export default async function EdexcelBoundariesPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()
  const copy = buildEdexcelSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.boundariesPath}
        title={`Edexcel IAL ${subject.name} grade boundaries`}
        description={`Grade-boundary hub for Edexcel IAL ${subject.name} (UMS).`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: subject.name, path: edexcelSubjectPath(qualification, subjectSlug) },
          { name: 'Grade boundaries', path: copy.boundariesPath },
        ]}
      />
      <MarketingHero
        label={`${subject.familyCode} · UMS`}
        title={`${subject.name} grade boundaries`}
        lead="Edexcel IAL uses Uniform Mark Scale (UMS) across modular units. This hub will host session boundary tables; until then, use the unit list to target the papers that matter for your cash-in."
      />
      <MarketingSection>
        <h2 className="ms-h2">Units in this subject</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {subject.units.map((u) => (
            <li key={u.code} className="ec-card p-4">
              <span className="font-semibold">{u.code}</span>
              <span className="ms-body-2 mt-1 block">{u.name}</span>
            </li>
          ))}
        </ul>
        <p className="ms-body-2 mt-6 text-[var(--ec-text-secondary)]">
          Need Cambridge boundaries now?{' '}
          <Link href="/tools/grade-boundary-calculator" className="underline">
            Open the grade-boundary calculator
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
