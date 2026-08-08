import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  buildMarkschemeGuidance,
  getQuestionObject,
  getSubjectLabel,
  listQuestionObjectSlugs,
} from '@/lib/seo/question-objects'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await listQuestionObjectSlugs(24)
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const q = await getQuestionObject(slug)
  if (!q) return {}
  const label = getSubjectLabel(q.subjectCode)
  return createPageMetadata({
    title: `${q.paperCode} Q${q.questionNumber} mark scheme — how marks are awarded [${label}]`,
    description: `Assessment guidance for Cambridge ${q.subjectCode} ${q.paperCode} Q${q.questionNumber}: marking logic, where students lose marks, valid alternatives, and remediation — not a copy of the PDF.`,
    path: `/markscheme/${slug}`,
    keywords: [
      `${q.paperCode} mark scheme`,
      `${q.subjectCode} mark scheme explained`,
      `how marks awarded ${q.paperCode}`,
      'examiner marking logic',
    ],
  })
}

export default async function MarkschemeObjectPage({ params }: Props) {
  const { slug } = await params
  const q = await getQuestionObject(slug)
  if (!q) notFound()
  const label = getSubjectLabel(q.subjectCode)
  const guide = buildMarkschemeGuidance(q)
  const path = `/markscheme/${slug}`

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${q.paperCode} Q${q.questionNumber} — mark scheme guidance`}
        description={guide.howMarksWork.slice(0, 160)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Mark schemes', path: '/markscheme' },
          { name: `${q.paperCode} Q${q.questionNumber}`, path },
        ]}
      />
      <MarketingHero
        label={`${q.subjectCode} · assessment / feedback object`}
        title={`${q.paperCode} Q${q.questionNumber} — how marks are awarded`}
        lead={`Examiner-style marking logic for Cambridge ${label}. This page is not the question stem and not a reproduction of the official mark scheme PDF.`}
      />
      <MarketingSection className="!pt-0">
        <article className="ec-card space-y-5 p-5">
          <section>
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              Marking logic
            </h2>
            <p className="ms-body-2 mt-3">{guide.howMarksWork}</p>
          </section>
          <section>
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              Step-by-step expected reasoning
            </h2>
            <p className="ms-body-2 mt-3">{guide.method}</p>
          </section>
          <section>
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              Where students lose marks
            </h2>
            <ul className="ms-body-2 mt-3 list-disc space-y-1 pl-5">
              {guide.commonLostMarks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              Alternative valid approaches
            </h2>
            <p className="ms-body-2 mt-3">{guide.alternatives}</p>
          </section>
          <section>
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              Targeted remediation
            </h2>
            <p className="ms-body-2 mt-3">{guide.remediation}</p>
          </section>
        </article>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={q.markHref} className="ec-btn-primary min-h-[48px]">
            Mark your attempt <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/questions/${slug}`} className="ec-btn-ghost min-h-[48px]">
            Question object (stem &amp; intent)
          </Link>
          {q.lessonHref ? (
            <Link href={q.lessonHref} className="ec-btn-ghost min-h-[48px]">
              Remediation lesson
            </Link>
          ) : null}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
