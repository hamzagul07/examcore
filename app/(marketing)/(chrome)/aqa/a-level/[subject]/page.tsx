import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { CrossBoardTopicLinks } from '@/components/seo/CrossBoardTopicLinks'
import { AqaSubjectStudyPath } from '@/components/seo/AqaSubjectStudyPath'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getAqaSubject, getAqaSubjects } from '@/lib/aqa/catalog'
import { aqaMarkHref } from '@/lib/aqa/marking'
import { aqaRootPath, aqaSubjectPath } from '@/lib/seo/aqa-graph'
import { verifiedCourseLessonsForAqaSubject } from '@/lib/curriculum-graph/verified-course-links'

type Props = { params: Promise<{ subject: string }> }

export function generateStaticParams() {
  return getAqaSubjects().map((s) => ({ subject: s.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { subject: slug } = await params
  const subject = getAqaSubject(slug)
  if (!subject) return {}
  return createPageMetadata({
    title: `AQA A-level ${subject.name} — mark & revise`,
    description: subject.blurb,
    path: aqaSubjectPath(subject.slug),
    keywords: [`AQA ${subject.name}`, 'AQA A-level', subject.contentCode],
  })
}

export default async function AqaSubjectPage({ params }: Props) {
  const { subject: slug } = await params
  const subject = getAqaSubject(slug)
  if (!subject) notFound()
  const markHref = aqaMarkHref(subject.contentCode)
  const path = aqaSubjectPath(subject.slug)
  const studyLessons = verifiedCourseLessonsForAqaSubject(subject.contentCode)
  const markingLive = subject.markingWave === 1

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`AQA ${subject.name}`}
        description={subject.blurb}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AQA', path: aqaRootPath() },
          { name: 'A-level', path: '/aqa/a-level' },
          { name: subject.name, path },
        ]}
      />
      <MarketingHero
        label={`AQA A-level · ${subject.contentCode}`}
        title={subject.name}
        lead={
          studyLessons.length > 0
            ? `Free mapped visual lessons for AQA ${subject.name}, then mark with AQA conventions — not a Cambridge default.`
            : subject.blurb
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {studyLessons.length > 0 ? (
            <a
              href="#aqa-study-path-h"
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
              Mark AQA {subject.name} -&gt;
            </Link>
          ) : null}
        </div>
      </MarketingHero>

      <MarketingSection>
        <AqaSubjectStudyPath
          contentCode={subject.contentCode}
          subjectName={subject.name}
          markHref={markHref}
          lessons={studyLessons}
        />

        <CrossBoardTopicLinks mode="aqa-subject" contentCode={subject.contentCode} />

        <h2 className="ms-h2 mt-10">Marking desk</h2>
        <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
          {markingLive
            ? `Practice and scanned scripts for AQA ${subject.name}. Use the study path above for mapped visuals first.`
            : 'Shell only — marking for this subject is not live yet.'}
        </p>
        <ul className="ms-board-index">
          {markingLive ? (
            <li>
              <Link href={markHref} className="ms-board-slip">
                <span className="ms-board-slip__code">M1</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">Mark with AQA dialect</span>
                  <span className="ms-board-slip__blurb">
                    Method and accuracy conventions for UK linear papers.
                  </span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ) : null}
          <li>
            <Link href="/edexcel/international-a-level" className="ms-board-slip">
              <span className="ms-board-slip__code">IAL</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">International Edexcel instead?</span>
                <span className="ms-board-slip__blurb">
                  Modular IAL units with UMS — different from UK linear AQA papers.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
