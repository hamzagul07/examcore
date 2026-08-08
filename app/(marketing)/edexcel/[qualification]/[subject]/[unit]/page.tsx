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
        lead={`Modular unit in Edexcel International A Level ${subject.name}. Topic lessons and in-context marking attach here as the Edexcel adapter fills out.`}
      />
      <MarketingSection>
        <h2 className="ms-h2">Next steps</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
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
          <li>
            <Link href={copy.path} className="ec-card block p-4 font-semibold">
              All {subject.name} units
            </Link>
          </li>
          <li>
            <Link href="/mark" className="ec-card block p-4 font-semibold">
              Mark an answer
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
