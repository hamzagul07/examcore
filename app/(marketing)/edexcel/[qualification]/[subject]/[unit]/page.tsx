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
import { getEdexcelIalSessionsForUnit } from '@/lib/edexcel/ial-paper-sessions'
import { edexcelMarkHref, getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import {
  EDEXCEL_IAL_MATHS_UMS_GUIDE,
  edexcelUnitGuideHref,
} from '@/lib/edexcel/seo-guides'
import {
  edexcelRootPath,
  edexcelSubjectBoundariesPath,
  edexcelSubjectPastPapersPath,
  edexcelSubjectPath,
  getAllEdexcelSubjectParams,
  resolveEdexcelSubject,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelSubjectCopy } from '@/lib/seo/edexcel-seo'
import { EdexcelUnitStudyPath } from '@/components/seo/EdexcelUnitStudyPath'
import { verifiedCourseLessonsForEdexcelUnit } from '@/lib/curriculum-graph/verified-course-links'

type Props = {
  params: Promise<{ qualification: string; subject: string; unit: string }>
}

export function generateStaticParams() {
  const out: Array<{ qualification: string; subject: string; unit: string }> = []
  for (const p of getAllEdexcelSubjectParams()) {
    const subject = resolveEdexcelSubject(p.qualification, p.subject)
    if (!subject) continue
    for (const u of subject.units) {
      out.push({
        qualification: p.qualification,
        subject: p.subject,
        unit: u.code.toLowerCase(),
      })
    }
  }
  return out
}

export async function generateMetadata({ params }: Props) {
  const { qualification, subject: subjectSlug, unit } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  const unitRow = subject?.units.find((u) => u.code.toLowerCase() === unit.toLowerCase())
  if (!subject || !unitRow) return {}
  const path = `${edexcelSubjectPath(qualification, subjectSlug)}/${unitRow.code.toLowerCase()}`
  return createPageMetadata({
    title: `${unitRow.code} ${unitRow.name} — Edexcel IAL ${subject.name}`,
    description: `Edexcel International A Level ${subject.name} unit ${unitRow.code} (${unitRow.name}): mapped free course lessons, past papers and Edexcel marking path.`,
    path,
    keywords: [
      unitRow.code,
      `Edexcel ${unitRow.code}`,
      `Edexcel IAL ${subject.name} ${unitRow.short}`,
      unitRow.name,
    ],
  })
}

export default async function EdexcelUnitPage({ params }: Props) {
  const { qualification, subject: subjectSlug, unit } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()
  const unitRow = subject.units.find((u) => u.code.toLowerCase() === unit.toLowerCase())
  if (!unitRow) notFound()

  const subjectPath = edexcelSubjectPath(qualification, subjectSlug)
  const path = `${subjectPath}/${unitRow.code.toLowerCase()}`
  const copy = buildEdexcelSubjectCopy(subject)
  const markHref = edexcelMarkHref(unitRow.code)
  const unitMarkable = getEdexcelMarkableUnitCodes().includes(unitRow.code)
  const sessions = getEdexcelIalSessionsForUnit(unitRow.code)
  const unitGuideHref = edexcelUnitGuideHref(unitRow.code)
  const studyLessons = verifiedCourseLessonsForEdexcelUnit(unitRow.code)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${unitRow.code} ${unitRow.name}`}
        description={`Edexcel IAL ${subject.name} unit ${unitRow.code}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: subject.name, path: subjectPath },
          { name: unitRow.code, path },
        ]}
      />
      <MarketingHero
        label={`${subject.familyCode} · ${unitRow.short}`}
        title={`${unitRow.code} — ${unitRow.name}`}
        lead={
          studyLessons.length > 0
            ? `Free mapped visual lessons for ${unitRow.code}, then mark with Pearson method/accuracy conventions — not a Cambridge default.`
            : unitMarkable
              ? `Modular unit in Edexcel International A Level ${subject.name}. Upload a practice answer or scanned script and get method/accuracy marking for ${unitRow.code}.`
              : `Modular unit in Edexcel International A Level ${subject.name}. Unit hubs and past-paper maps are live; IAL STEM marking is available on /mark.`
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {studyLessons.length > 0 ? (
            <a
              href="#edexcel-study-path-h"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              Start study path -&gt;
            </a>
          ) : null}
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
            {unitMarkable ? `Mark ${unitRow.code} -&gt;` : 'Open Edexcel marking -&gt;'}
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <EdexcelUnitStudyPath
          unitCode={unitRow.code}
          unitName={unitRow.name}
          markHref={markHref}
          lessons={studyLessons}
        />

        <div className="ms-board-cross mb-8">
          <p className="ms-overline">Marking desk</p>
          <h2 className="ms-h2">Mark a {unitRow.code} answer</h2>
          <p className="ms-body-2 mt-2 max-w-lg text-[var(--ec-text-secondary)]">
            {unitMarkable
              ? `After a visual lesson — practice answers and scanned scripts with Edexcel IAL ${subject.name} conventions.`
              : 'Open the Edexcel mark picker — Maths, Physics, Chemistry and Biology units are live.'}
          </p>
          <div className="mt-5">
            <Link
              href={markHref}
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              {unitMarkable ? `Mark ${unitRow.code} -&gt;` : 'Open Edexcel marking -&gt;'}
            </Link>
          </div>
        </div>

        {sessions.length > 0 ? (
          <>
            <h2 className="ms-h2">Exam series</h2>
            <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
              Typical IAL sittings for {unitRow.code}. Use your own QP/MS from Pearson or
              your school, then mark a practice answer here.
            </p>
            <ul className="ms-board-index mb-8">
              {sessions.map((s) => (
                <li key={s.label}>
                  <Link href={markHref} className="ms-board-slip ms-board-slip--compact">
                    <span className="ms-board-slip__body">
                      <span className="ms-board-slip__name">{s.label}</span>
                      <span className="ms-board-slip__meta">Mark practice</span>
                    </span>
                    <span className="ms-board-slip__go" aria-hidden>
                      -&gt;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h2 className="ms-h2">Also on this subject</h2>
        <ul className="ms-board-index ms-board-index--guides">
          {unitGuideHref ? (
            <li>
              <Link href={unitGuideHref} className="ms-board-slip ms-board-slip--compact">
                <span className="ms-board-slip__code">RG</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{unitRow.code} revision guide</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              href={edexcelSubjectPastPapersPath(qualification, subjectSlug)}
              className="ms-board-slip ms-board-slip--compact"
            >
              <span className="ms-board-slip__code">PP</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">{subject.name} past papers</span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={edexcelSubjectBoundariesPath(qualification, subjectSlug)}
              className="ms-board-slip ms-board-slip--compact"
            >
              <span className="ms-board-slip__code">GB</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Grade boundaries</span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          {unitMarkable ? (
            <li>
              <Link
                href={EDEXCEL_IAL_MATHS_UMS_GUIDE}
                className="ms-board-slip ms-board-slip--compact"
              >
                <span className="ms-board-slip__code">UMS</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">UMS &amp; cash-in guide</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ) : null}
          <li>
            <Link href={copy.path} className="ms-board-slip ms-board-slip--compact">
              <span className="ms-board-slip__code">{subject.familyCode}</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">All {subject.name} units</span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href={markHref} className="ms-board-slip ms-board-slip--compact">
              <span className="ms-board-slip__code">M1</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Mark an answer</span>
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
