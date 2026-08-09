import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllOxfordaqaSubjectParams,
  oxfordaqaPaperPath,
  oxfordaqaRootPath,
  oxfordaqaSubjectPath,
  resolveOxfordaqaSubject,
} from '@/lib/seo/oxfordaqa-graph'
import { buildOxfordaqaSubjectCopy } from '@/lib/seo/oxfordaqa-seo'
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
    title: `OxfordAQA ${subject.name} past papers`,
    description: `Past-paper index for OxfordAQA International A-level ${subject.name}.`,
    path: copy.pastPapersPath,
    keywords: [
      `OxfordAQA ${subject.name} past papers`,
      'OxfordAQA International A-level past papers',
    ],
  })
}

export default async function OxfordaqaPastPapersPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveOxfordaqaSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const copy = buildOxfordaqaSubjectCopy(subject)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.pastPapersPath}
        title={`OxfordAQA ${subject.name} past papers`}
        description={`Paper map for OxfordAQA ${subject.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: oxfordaqaRootPath() },
          { name: subject.name, path: oxfordaqaSubjectPath(qualification, subjectSlug) },
          { name: 'Past papers', path: copy.pastPapersPath },
        ]}
      />
      <MarketingHero
        label={`${subject.name} · Past papers`}
        title={`${subject.name} past papers`}
        lead="Linear OxfordAQA papers — use this map while session archives fill in. Marking for this board unlocks after Edexcel IAL Maths conversion."
      />
      <MarketingSection>
        <h2 className="ms-h2">Papers</h2>
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

        <div className="ms-board-cross mt-8">
          <p className="ms-overline">Live marking</p>
          <h2 className="ms-h2">Mark OxfordAQA {subject.name}</h2>
          <p className="ms-body-2 mt-2 max-w-xl text-[var(--ec-text-secondary)]">
            Keep the board dialect — open /mark with OxfordAQA selected, not Cambridge default.
          </p>
          <div className="mt-5">
            <Link
              href={oxfordaqaMarkHref(subject.contentCode)}
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark OxfordAQA {subject.name} -&gt;
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
