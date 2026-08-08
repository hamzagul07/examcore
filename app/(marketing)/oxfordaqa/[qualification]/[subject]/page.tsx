import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getOxfordaqaQualification } from '@/lib/oxfordaqa/catalog'
import {
  getAllOxfordaqaSubjectParams,
  oxfordaqaPaperPath,
  oxfordaqaRootPath,
  oxfordaqaSubjectBoundariesPath,
  oxfordaqaSubjectPastPapersPath,
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
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
  })
}

export default async function OxfordaqaSubjectPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getOxfordaqaQualification(qualification)
  if (!qual) notFound()
  const copy = buildOxfordaqaSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: qual.label, path: `/oxfordaqa/${qualification}` },
          { name: subject.name, path: copy.path },
        ]}
      />
      <MarketingHero
        label={`OxfordAQA · ${subject.contentCode}`}
        title={subject.name}
        lead={subject.blurb}
      />

      <MarketingSection>
        <h2 className="ms-h2">Papers</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
          Shell only — marking stays on Cambridge, IB and Edexcel IAL Maths until
          OxfordAQA earns its engineering allocation.
        </p>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-3">
          {subject.papers.map((p) => (
            <li key={p.slug}>
              <Link
                href={oxfordaqaPaperPath(qualification, subjectSlug, p.slug)}
                className="ec-card block p-4"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="ms-micro ml-2 uppercase tracking-wide">{p.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Tools</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          <li>
            <Link
              href={oxfordaqaSubjectPastPapersPath(qualification, subjectSlug)}
              className="ec-card block p-4"
            >
              <span className="font-semibold">Past papers</span>
              <span className="ms-body-2 mt-1 block">
                Paper map for OxfordAQA {subject.name}.
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={oxfordaqaSubjectBoundariesPath(qualification, subjectSlug)}
              className="ec-card block p-4"
            >
              <span className="font-semibold">Grade boundaries</span>
              <span className="ms-body-2 mt-1 block">
                Boundary reference hub for {subject.name}.
              </span>
            </Link>
          </li>
          <li>
            <Link href="/edexcel/international-a-level/mathematics" className="ec-card block p-4">
              <span className="font-semibold">Edexcel IAL Maths is live</span>
              <span className="ms-body-2 mt-1 block">
                Marking is live for Edexcel first — prove conversion, then OxfordAQA.
              </span>
            </Link>
          </li>
          <li>
            <Link href="/mark" className="ec-card block p-4">
              <span className="font-semibold">Mark an answer</span>
              <span className="ms-body-2 mt-1 block">
                Cambridge, IB and Edexcel IAL Maths marking are available today.
              </span>
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
