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
  oxfordaqaSubjectPath,
  resolveOxfordaqaSubject,
} from '@/lib/seo/oxfordaqa-graph'
import { buildOxfordaqaSubjectCopy } from '@/lib/seo/oxfordaqa-seo'

type Props = {
  params: Promise<{ qualification: string; subject: string; paper: string }>
}

export function generateStaticParams() {
  const out: Array<{ qualification: string; subject: string; paper: string }> = []
  for (const p of getAllOxfordaqaSubjectParams()) {
    const subject = resolveOxfordaqaSubject(p.qualification, p.subject)
    if (!subject) continue
    for (const paper of subject.papers) {
      out.push({
        qualification: p.qualification,
        subject: p.subject,
        paper: paper.slug,
      })
    }
  }
  return out
}

export async function generateMetadata({ params }: Props) {
  const { qualification, subject: subjectSlug, paper } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  const paperRow = subject?.papers.find((p) => p.slug === paper)
  if (!subject || !paperRow) return {}
  const path = oxfordaqaPaperPath(qualification, subjectSlug, paperRow.slug)
  return createPageMetadata({
    title: `${paperRow.name} — OxfordAQA ${subject.name}`,
    description: `OxfordAQA International A-level ${subject.name} ${paperRow.name}: syllabus map and marking path.`,
    path,
    keywords: [
      `OxfordAQA ${subject.name} ${paperRow.name}`,
      `OxfordAQA ${subject.name} past paper`,
    ],
  })
}

export default async function OxfordaqaPaperPage({ params }: Props) {
  const { qualification, subject: subjectSlug, paper } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getOxfordaqaQualification(qualification)
  if (!qual) notFound()
  const paperRow = subject.papers.find((p) => p.slug === paper)
  if (!paperRow) notFound()

  const subjectPath = oxfordaqaSubjectPath(qualification, subjectSlug)
  const path = oxfordaqaPaperPath(qualification, subjectSlug, paperRow.slug)
  const copy = buildOxfordaqaSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${paperRow.name} — ${subject.name}`}
        description={`OxfordAQA ${subject.name} ${paperRow.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: subject.name, path: subjectPath },
          { name: paperRow.name, path },
        ]}
      />
      <MarketingHero
        label={`OxfordAQA · ${paperRow.short}`}
        title={`${subject.name} — ${paperRow.name}`}
        lead={`Linear paper in OxfordAQA International A-level ${subject.name}. Topic lessons and marking attach here once this board clears the expansion gates.`}
      />
      <MarketingSection>
        <h2 className="ms-h2">Next steps</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          <li>
            <Link
              href={oxfordaqaSubjectPastPapersPath(qualification, subjectSlug)}
              className="ec-card block p-4 font-semibold"
            >
              {subject.name} past papers
            </Link>
          </li>
          <li>
            <Link
              href={oxfordaqaSubjectBoundariesPath(qualification, subjectSlug)}
              className="ec-card block p-4 font-semibold"
            >
              Grade boundaries
            </Link>
          </li>
          <li>
            <Link href={copy.path} className="ec-card block p-4 font-semibold">
              All {subject.name} papers
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
