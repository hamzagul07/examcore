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
        <div className="ms-board-cross mb-8">
          <p className="ms-overline">Shell status</p>
          <h2 className="ms-h2">Marking attaches later</h2>
          <p className="ms-body-2 mt-2 max-w-xl text-[var(--ec-text-secondary)]">
            Browse the paper map and boundaries here. For handwriting feedback today, use Cambridge
            or Edexcel IAL Maths.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/mark"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Open marking desk -&gt;
            </Link>
            <Link
              href="/edexcel/international-a-level/mathematics"
              className="ec-btn-ghost inline-flex min-h-[48px]"
            >
              Edexcel IAL Maths
            </Link>
          </div>
        </div>

        <h2 className="ms-h2">Next steps</h2>
        <ul className="ms-board-index ms-board-index--guides">
          <li>
            <Link
              href={oxfordaqaSubjectPastPapersPath(qualification, subjectSlug)}
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
              href={oxfordaqaSubjectBoundariesPath(qualification, subjectSlug)}
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
          <li>
            <Link href={copy.path} className="ms-board-slip ms-board-slip--compact">
              <span className="ms-board-slip__code">{paperRow.short}</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">All {subject.name} papers</span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href="/mark" className="ms-board-slip ms-board-slip--compact">
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
