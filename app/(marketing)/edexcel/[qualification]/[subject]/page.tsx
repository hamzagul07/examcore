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
  edexcelSubjectBoundariesPath,
  edexcelSubjectPastPapersPath,
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
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
  })
}

export default async function EdexcelSubjectPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()

  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()

  const copy = buildEdexcelSubjectCopy(subject)
  const pastPapersPath = edexcelSubjectPastPapersPath(qualification, subjectSlug)
  const boundariesPath = edexcelSubjectBoundariesPath(qualification, subjectSlug)
  const waveNote =
    subject.slug === 'mathematics'
      ? 'Wave 1 marking is live for IAL Maths units — practice and scanned scripts on /mark.'
      : subject.markingWave === 1
        ? 'Wave 1 shell — Physics and Chemistry marking follow once Maths conversion is proven.'
        : subject.markingWave === 1.5
          ? 'Wave 1.5 — Biology shell is live; phrase-level marking follows STEM conversion.'
          : 'Later marking wave.'

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: qual.label, path: `/edexcel/${qualification}` },
          { name: subject.name, path: copy.path },
        ]}
      />
      <MarketingHero
        label={`Edexcel IAL · ${subject.familyCode}`}
        title={subject.name}
        lead={subject.blurb}
      />

      <MarketingSection>
        <h2 className="ms-h2">Units</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">{waveNote}</p>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {subject.units.map((u) => (
            <li key={u.code}>
              <Link
                href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                className="ec-card block p-4"
              >
                <span className="font-semibold">{u.code}</span>
                <span className="ms-micro ml-2 uppercase tracking-wide">{u.short}</span>
                <span className="ms-body-2 mt-1 block">{u.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Tools</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          <li>
            <Link href={pastPapersPath} className="ec-card block p-4">
              <span className="font-semibold">Past papers</span>
              <span className="ms-body-2 mt-1 block">
                Session index and unit paper map for Edexcel IAL {subject.name}.
              </span>
            </Link>
          </li>
          <li>
            <Link href={boundariesPath} className="ec-card block p-4">
              <span className="font-semibold">Grade boundaries</span>
              <span className="ms-body-2 mt-1 block">
                UMS and raw mark boundary reference for {subject.name} units.
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={
                subject.slug === 'mathematics'
                  ? '/mark?board=edexcel&subject=WMA11'
                  : '/mark?board=edexcel'
              }
              className="ec-card block p-4"
            >
              <span className="font-semibold">Mark an answer</span>
              <span className="ms-body-2 mt-1 block">
                {subject.slug === 'mathematics'
                  ? 'Edexcel IAL Maths marking is live — practice and scanned scripts with method/accuracy conventions.'
                  : 'Edexcel Maths marking is live first. Physics and Chemistry follow once conversion is proven.'}
              </span>
            </Link>
          </li>
          <li>
            <Link href="/caie" className="ec-card block p-4">
              <span className="font-semibold">Studying Cambridge too?</span>
              <span className="ms-body-2 mt-1 block">
                Many international schools offer both. Browse the CAIE syllabus graph.
              </span>
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
