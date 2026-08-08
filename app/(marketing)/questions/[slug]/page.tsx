import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  buildQuestionIntent,
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
    title: `${q.paperCode} Q${q.questionNumber} — what the examiner is asking [${label}]`,
    description: `Cambridge ${q.subjectCode} ${q.paperCode} question ${q.questionNumber} (${q.sessionLabel}): concept tested, difficulty, prerequisites, and a short stem preview — then try it yourself.`,
    path: `/questions/${slug}`,
    keywords: [
      `${q.paperCode} question ${q.questionNumber}`,
      `${q.subjectCode} past paper question`,
      `${label} ${q.topicCode ?? ''} practice`.trim(),
      'what the examiner is asking',
    ],
  })
}

export default async function QuestionObjectPage({ params }: Props) {
  const { slug } = await params
  const q = await getQuestionObject(slug)
  if (!q) notFound()
  const label = getSubjectLabel(q.subjectCode)
  const intent = buildQuestionIntent(q)
  const path = `/questions/${slug}`

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${q.paperCode} Q${q.questionNumber} — examinable question`}
        description={intent.examinerAsk.slice(0, 160)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Questions', path: '/questions' },
          { name: `${q.paperCode} Q${q.questionNumber}`, path },
        ]}
      />
      <MarketingHero
        label={`${q.subjectCode} · ${q.sessionLabel} · examinable unit`}
        title={`${q.paperCode} Question ${q.questionNumber}`}
        lead={`Cambridge ${label} · ${q.totalMarks} marks${q.topicCode ? ` · syllabus ${q.topicCode}` : ''}. This page is the question object — what is being tested — not the mark scheme.`}
      />
      <MarketingSection className="!pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="ec-card p-5 md:col-span-2">
            <p className="ms-overline">Stem preview</p>
            <p className="ms-body-2 mt-3">{q.preview}</p>
            <p className="ms-micro mt-3 text-[var(--ec-text-faint)]">
              Full stem stays in the official paper. We show a short excerpt so you can
              identify the item, then attempt your own answer.
            </p>
          </article>
          <aside className="ec-card p-5">
            <p className="ms-overline">Question metadata</p>
            <dl className="ms-body-2 mt-3 space-y-2">
              <div>
                <dt className="text-[var(--ec-text-faint)]">Paper / session</dt>
                <dd>
                  {q.paperCode} · {q.sessionLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--ec-text-faint)]">Marks</dt>
                <dd>{q.totalMarks}</dd>
              </div>
              <div>
                <dt className="text-[var(--ec-text-faint)]">Difficulty band</dt>
                <dd>{intent.difficulty}</dd>
              </div>
              <div>
                <dt className="text-[var(--ec-text-faint)]">Concept</dt>
                <dd>{q.topicCode ? `Syllabus ${q.topicCode}` : label}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <article className="ec-card mt-6 p-5">
          <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
            What the examiner is asking
          </h2>
          <p className="ms-body-2 mt-3">{intent.examinerAsk}</p>
        </article>

        <article className="ec-card mt-4 p-5">
          <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
            Prerequisite concepts
          </h2>
          <ul className="ms-body-2 mt-3 list-disc space-y-1 pl-5">
            {intent.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {q.lessonHref ? (
            <Link href={q.lessonHref} className="ec-btn-ghost mt-4 inline-flex min-h-[44px]">
              Open prerequisite lesson
            </Link>
          ) : null}
        </article>

        <article className="ec-card mt-4 p-5">
          <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
            Similar practice
          </h2>
          <p className="ms-body-2 mt-3">{intent.similarPracticeHint}</p>
        </article>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={q.markHref} className="ec-btn-primary min-h-[48px]">
            Try it yourself — mark my answer <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/markscheme/${slug}`} className="ec-btn-ghost min-h-[48px]">
            How marks are awarded (assessment page)
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
