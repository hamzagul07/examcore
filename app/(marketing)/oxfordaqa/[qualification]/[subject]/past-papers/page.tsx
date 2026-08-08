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
    title: `OxfordAQA ${subject.name} past papers`,
    description: `Past-paper index for OxfordAQA International A-level ${subject.name}.`,
    path: copy.pastPapersPath,
    keywords: [
      `OxfordAQA ${subject.name} past papers`,
      'OxfordAQA International A-level past papers',
    ],
  })
}

export default async function OxfordaqaPastPapersPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const copy = buildOxfordaqaSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.pastPapersPath}
        title={`OxfordAQA ${subject.name} past papers`}
        description={`Paper map for OxfordAQA ${subject.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: subject.name, path: oxfordaqaSubjectPath(qualification, subjectSlug) },
          { name: 'Past papers', path: copy.pastPapersPath },
        ]}
      />
      <MarketingHero
        label={`${subject.name} · Past papers`}
        title={`${subject.name} past papers`}
        lead="Linear OxfordAQA papers — use this map while session archives fill in. Marking for this board unlocks after Edexcel IAL Maths conversion."
      />
      <MarketingSection>
        <h2 className="ms-h2">Papers</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-3">
          {subject.papers.map((p) => (
            <li key={p.slug} className="ec-card p-4">
              <span className="font-semibold">{p.name}</span>
            </li>
          ))}
        </ul>
        <p className="ms-body-2 mt-6 text-[var(--ec-text-secondary)]">
          Prefer a board with live marking?{' '}
          <Link href="/mark" className="underline">
            Mark on Cambridge, IB or Edexcel
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
