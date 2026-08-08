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
import { getEdexcelMathsSessionsForUnit } from '@/lib/edexcel/maths-paper-sessions'
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
    description: `Edexcel International A Level ${subject.name} unit ${unitRow.code} (${unitRow.name}): syllabus map, past papers and marking path.`,
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
  const sessions = getEdexcelMathsSessionsForUnit(unitRow.code)
  const unitGuideHref = edexcelUnitGuideHref(unitRow.code)

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
          unitMarkable
            ? `Modular unit in Edexcel International A Level ${subject.name}. Upload a practice answer or scanned script and get method/accuracy marking for ${unitRow.code}.`
            : `Modular unit in Edexcel International A Level ${subject.name}. Unit hubs and past-paper maps are live; Maths marking is available first while other subjects follow conversion.`
        }
      />
      <MarketingSection>
        <div className="ec-card ec-card--paper mb-8 border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-bg-soft))] px-6 py-8 text-center sm:px-10">
          <h2 className="ms-h2">Mark a {unitRow.code} answer</h2>
          <p className="mx-auto mt-2 max-w-lg text-[var(--ec-text-secondary)]">
            {unitMarkable
              ? 'Practice questions and scanned scripts — Edexcel IAL Maths conventions, not a Cambridge default.'
              : 'Open the Edexcel mark picker. Wave 1 Maths units are live; this unit’s dialect follows once Maths converts.'}
          </p>
          <Link href={markHref} className="ec-btn-primary mt-5 inline-flex min-h-[48px]">
            {unitMarkable ? `Mark ${unitRow.code} →` : 'Open Edexcel marking →'}
          </Link>
        </div>
        {sessions.length > 0 ? (
          <>
            <h2 className="ms-h2">Exam series</h2>
            <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
              Typical IAL sittings for {unitRow.code}. Use your own QP/MS from Pearson or
              your school, then mark a practice answer here.
            </p>
            <ul className="mb-8 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s) => (
                <li key={s.label}>
                  <Link
                    href={markHref}
                    className="ec-card flex items-center justify-between gap-2 p-3 text-sm"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="ms-micro uppercase tracking-wide text-[var(--ec-accent)]">
                      Mark →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h2 className="ms-h2">Also on this subject</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {unitGuideHref ? (
            <li>
              <Link href={unitGuideHref} className="ec-card block p-4 font-semibold">
                {unitRow.code} revision guide
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              href={edexcelSubjectPastPapersPath(qualification, subjectSlug)}
              className="ec-card block p-4 font-semibold"
            >
              {subject.name} past papers
            </Link>
          </li>
          <li>
            <Link
              href={edexcelSubjectBoundariesPath(qualification, subjectSlug)}
              className="ec-card block p-4 font-semibold"
            >
              Grade boundaries
            </Link>
          </li>
          {unitMarkable ? (
            <li>
              <Link href={EDEXCEL_IAL_MATHS_UMS_GUIDE} className="ec-card block p-4 font-semibold">
                UMS & cash-in guide
              </Link>
            </li>
          ) : null}
          <li>
            <Link href={copy.path} className="ec-card block p-4 font-semibold">
              All {subject.name} units
            </Link>
          </li>
          <li>
            <Link href={markHref} className="ec-card block p-4 font-semibold">
              Mark an answer
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
