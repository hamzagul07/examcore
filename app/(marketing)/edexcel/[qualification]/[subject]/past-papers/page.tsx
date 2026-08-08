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
import { edexcelMarkHref, getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import {
  edexcelRootPath,
  edexcelSubjectPath,
  edexcelUnitPath,
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
  const markable = new Set(getEdexcelMarkableUnitCodes())
  const defaultMarkHref =
    subject.slug === 'mathematics' ? edexcelMarkHref('WMA11') : edexcelMarkHref()

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
        lead={`Edexcel IAL ${subject.name} is modular. Use the unit map below, then mark practice answers with Edexcel conventions — session PDF archives grow here without sending you to Cambridge.`}
      />
      <MarketingSection>
        <h2 className="ms-h2">Units</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {subject.units.map((u) => {
            const canMark = markable.has(u.code)
            return (
              <li key={u.code} className="ec-card p-4">
                <Link
                  href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                  className="font-semibold text-[var(--ec-text-primary)] underline-offset-2 hover:underline"
                >
                  {u.code}
                </Link>
                <span className="ms-body-2 mt-1 block">{u.name}</span>
                {canMark ? (
                  <Link
                    href={edexcelMarkHref(u.code)}
                    className="ms-micro mt-3 inline-block font-semibold uppercase tracking-wide text-[var(--ec-accent)]"
                  >
                    Mark {u.code} →
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
        <p className="ms-body-2 mt-6 text-[var(--ec-text-secondary)]">
          Worked a paper?{' '}
          <Link href={defaultMarkHref} className="underline">
            Mark an Edexcel answer
          </Link>
          {subject.slug === 'mathematics'
            ? ' with method/accuracy conventions for IAL Maths.'
            : ' — Maths units are live first; this subject’s dialect follows once conversion is proven.'}
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
