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
import { edexcelMarkHref } from '@/lib/edexcel/marking'
import {
  edexcelRootPath,
  edexcelSubjectBoundariesPath,
  edexcelSubjectPastPapersPath,
  edexcelUnitPath,
  getAllEdexcelSubjectParams,
  resolveEdexcelSubject,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelSubjectCopy } from '@/lib/seo/edexcel-seo'
import { CrossBoardTopicLinks } from '@/components/seo/CrossBoardTopicLinks'

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
  const markHref =
    subject.slug === 'mathematics'
      ? edexcelMarkHref('WMA11')
      : subject.slug === 'physics'
        ? edexcelMarkHref('WPH11')
        : subject.slug === 'chemistry'
          ? edexcelMarkHref('WCH11')
          : subject.slug === 'biology'
            ? edexcelMarkHref('WBI11')
            : edexcelMarkHref()
  const markingLive = subject.markingWave === 1 || subject.markingWave === 1.5
  const waveNote =
    subject.markingWave === 1
      ? 'Wave 1 marking is live — practice and scanned scripts on /mark with Edexcel method/accuracy conventions.'
      : subject.markingWave === 1.5
        ? 'Wave 1.5 Biology marking is live — phrase-level mark-scheme matching on /mark.'
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
      >
        {markingLive ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={markHref}
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark {subject.name} -&gt;
            </Link>
            <Link href={pastPapersPath} className="ec-btn-ghost inline-flex min-h-[48px]">
              Past papers
            </Link>
          </div>
        ) : null}
      </MarketingHero>

      <MarketingSection>
        <h2 className="ms-h2">Units</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">{waveNote}</p>
        <ul className="ms-board-index">
          {subject.units.map((u) => (
            <li key={u.code}>
              <Link
                href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{u.code}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{u.name}</span>
                  <span className="ms-board-slip__meta">{u.short}</span>
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
            <Link href={pastPapersPath} className="ms-board-slip">
              <span className="ms-board-slip__code">PP</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Past papers</span>
                <span className="ms-board-slip__blurb">
                  Session index and unit paper map for Edexcel IAL {subject.name}.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href={boundariesPath} className="ms-board-slip">
              <span className="ms-board-slip__code">GB</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Grade boundaries</span>
                <span className="ms-board-slip__blurb">
                  UMS and raw mark boundary reference for {subject.name} units.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href={markHref} className="ms-board-slip">
              <span className="ms-board-slip__code">M1</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Mark an answer</span>
                <span className="ms-board-slip__blurb">
                  {subject.markingWave === 1
                    ? `Edexcel IAL ${subject.name} marking is live — practice and scanned scripts with method/accuracy conventions.`
                    : 'Biology marking is live with phrase-level matching. All IAL STEM units are on /mark.'}
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href="/caie" className="ms-board-slip">
              <span className="ms-board-slip__code">CAIE</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Studying Cambridge too?</span>
                <span className="ms-board-slip__blurb">
                  Many international schools offer both. Browse the CAIE syllabus graph.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
        {qualification === 'international-a-level' && subject.slug === 'mathematics' ? (
          <CrossBoardTopicLinks mode="edexcel-subject-hub" syllabusCode="9709" />
        ) : qualification === 'international-a-level' && subject.slug === 'physics' ? (
          <CrossBoardTopicLinks mode="edexcel-subject-hub" syllabusCode="9702" />
        ) : qualification === 'international-a-level' && subject.slug === 'chemistry' ? (
          <CrossBoardTopicLinks mode="edexcel-subject-hub" syllabusCode="9701" />
        ) : qualification === 'international-a-level' && subject.slug === 'biology' ? (
          <CrossBoardTopicLinks mode="edexcel-subject-hub" syllabusCode="9700" />
        ) : null}
      </MarketingSection>
    </MarketingPageShell>
  )
}
