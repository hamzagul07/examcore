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
import { OxfordaqaSubjectStudyPath } from '@/components/seo/OxfordaqaSubjectStudyPath'
import { oxfordaqaMarkHref } from '@/lib/oxfordaqa/marking'
import { verifiedCourseLessonsForOxfordaqaSubject } from '@/lib/curriculum-graph/verified-course-links'

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
  const markHref = oxfordaqaMarkHref(subject.contentCode)
  const markingLive = subject.markingWave === 1 || subject.markingWave === 1.5
  const studyLessons = verifiedCourseLessonsForOxfordaqaSubject(subject.contentCode)

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
        lead={
          studyLessons.length > 0
            ? `Free mapped visual lessons for OxfordAQA ${subject.name}, then mark with OxfordAQA conventions — not a Cambridge default.`
            : subject.blurb
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {studyLessons.length > 0 ? (
            <a
              href="#oxfordaqa-study-path-h"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              Start study path -&gt;
            </a>
          ) : null}
          {markingLive ? (
            <Link
              href={markHref}
              className={
                studyLessons.length > 0
                  ? 'ec-btn-ghost inline-flex min-h-[48px] items-center gap-2'
                  : 'ec-btn-primary inline-flex min-h-[48px] items-center gap-2'
              }
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark OxfordAQA {subject.name} -&gt;
            </Link>
          ) : null}
        </div>
      </MarketingHero>

      <MarketingSection>
        <OxfordaqaSubjectStudyPath
          contentCode={subject.contentCode}
          subjectName={subject.name}
          markHref={markHref}
          lessons={studyLessons}
        />

        <h2 className="ms-h2">Papers</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
          {markingLive
            ? `Paper shells for OxfordAQA ${subject.name}. Marking is live on /mark — use the study path above for mapped visuals first.`
            : 'Shell only — marking for this subject is not live yet.'}
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
          {markingLive ? (
            <li>
              <Link href={markHref} className="ms-board-slip">
                <span className="ms-board-slip__code">M1</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">Mark on OxfordAQA</span>
                  <span className="ms-board-slip__blurb">
                    Practice answers and scanned scripts — OxfordAQA conventions.
                  </span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
        {markingLive ? (
          <CrossBoardTopicLinks mode="oxfordaqa-subject" contentCode={subject.contentCode} />
        ) : null}
      </MarketingSection>
    </MarketingPageShell>
  )
}
