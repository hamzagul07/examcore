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
import { CrossBoardTopicLinks } from '@/components/seo/CrossBoardTopicLinks'
import { oxfordaqaMarkHref } from '@/lib/oxfordaqa/marking'

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
        <ul className="ms-board-index">
          {subject.papers.map((p) => (
            <li key={p.slug}>
              <Link
                href={oxfordaqaPaperPath(qualification, subjectSlug, p.slug)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{p.short}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{p.name}</span>
                  <span className="ms-board-slip__meta">Shell index</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Tools</h2>
        <ul className="ms-board-index ms-board-index--guides">
          <li>
            <Link
              href={oxfordaqaSubjectPastPapersPath(qualification, subjectSlug)}
              className="ms-board-slip"
            >
              <span className="ms-board-slip__code">PP</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Past papers</span>
                <span className="ms-board-slip__blurb">
                  Paper map for OxfordAQA {subject.name}.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={oxfordaqaSubjectBoundariesPath(qualification, subjectSlug)}
              className="ms-board-slip"
            >
              <span className="ms-board-slip__code">GB</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Grade boundaries</span>
                <span className="ms-board-slip__blurb">
                  Boundary reference hub for {subject.name}.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/edexcel/international-a-level/mathematics"
              className="ms-board-slip"
            >
              <span className="ms-board-slip__code">IAL</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Edexcel IAL Maths is live</span>
                <span className="ms-board-slip__blurb">
                  Marking is live for Edexcel first — prove conversion, then OxfordAQA.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href={oxfordaqaMarkHref(subject.contentCode)} className="ms-board-slip">
              <span className="ms-board-slip__code">M1</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Mark on OxfordAQA</span>
                <span className="ms-board-slip__blurb">
                  Maths, Physics, Chemistry and Biology marking is live on /mark.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
        {subject.markingWave === 1 || subject.markingWave === 1.5 ? (
          <CrossBoardTopicLinks mode="oxfordaqa-subject" contentCode={subject.contentCode} />
        ) : null}
      </MarketingSection>
    </MarketingPageShell>
  )
}
