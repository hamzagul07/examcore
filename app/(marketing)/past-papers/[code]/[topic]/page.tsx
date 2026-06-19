import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import {
  getAllTopicQuestionParams,
  getTopicQuestionPage,
  getTopicQuestionPages,
  buildTopicQuestionCopy,
} from '@/lib/seo/topic-questions'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { getCourseSubject } from '@/lib/courses'

type Props = { params: Promise<{ code: string; topic: string }> }

export function generateStaticParams() {
  return getAllTopicQuestionParams()
}

export async function generateMetadata({ params }: Props) {
  const { code, topic } = await params
  const page = getTopicQuestionPage(code, topic)
  if (!page) return {}
  const copy = buildTopicQuestionCopy(code, page)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: `/past-papers/opengraph-image`,
  })
}

export default async function TopicQuestionsPage({ params }: Props) {
  const { code, topic } = await params
  const page = getTopicQuestionPage(code, topic)
  if (!page) notFound()

  const copy = buildTopicQuestionCopy(code, page)
  const accent = getCatalogSubject(code)?.color ?? 'var(--ec-brand)'
  const course = getCourseSubject(code)
  const lessonHref = course ? `/courses/${code}/${page.lessonSlug}` : null
  const url = `${SITE_URL}${copy.path}`

  const faq = [
    {
      q: `How many ${page.title} questions are there for ${code}?`,
      a: `This page collects ${page.questionCount} recent Cambridge ${copy.label} (${code}) past-paper questions tagged to ${page.title}. Each links straight to instant marking against the official ${code} scheme.`,
    },
    {
      q: `How are ${page.title} answers marked?`,
      a: `Upload a photo of your working and MarkScheme scores it against the real ${code} mark scheme for this topic — method, accuracy and any band descriptors — so you see exactly where the marks are.`,
    },
    {
      q: `Where can I learn ${page.title} first?`,
      a: lessonHref
        ? `Start with the free ${copy.label} lesson on ${page.title}, then come back and drill these past-paper questions under timed conditions.`
        : `Revise the topic, then attempt these past-paper questions under timed conditions and mark them against the official scheme.`,
    },
  ]

  const related = getTopicQuestionPages(code)
    .filter((t) => t.topicSlug !== topic)
    .slice(0, 10)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Past papers', path: '/past-papers' },
          { name: `${copy.label} ${code}`, path: `/past-papers/${code}` },
          { name: page.title, path: copy.path },
        ]}
      />
      <JsonLd
        data={[
          learningResourceNode({
            name: copy.title,
            description: copy.description,
            url,
            syllabusCode: code,
            topics: [page.title],
            level: copy.level,
          }),
          itemListNode({
            name: `${page.title} past-paper questions (${code})`,
            items: page.questions.map((q) => ({
              name: `${page.title} — ${q.sessionLabel} ${q.paperCode} Q${q.questionNumber} (${q.marks} marks)`,
              url: `${SITE_URL}${q.markHref}`,
              description: q.stem,
            })),
          }),
          faqPageNode(faq, {
            speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'],
          }),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ '--sc': accent, paddingTop: 48 } as CSSProperties}>
        <Link href={`/past-papers/${code}`} className="ec-btn-underline text-[15px]">
          ← {code} past papers
        </Link>

        <div className="ms-sd-head">
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 4 }}>
              {page.title}{' '}
              <em style={{ color: 'var(--ec-text-faint)', fontSize: '0.55em' }}>· {code} past paper questions</em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{copy.label}</Chip>
              <Chip variant="dim">Topic {page.topicCode}</Chip>
              <Chip variant="ok">{page.questionCount} questions ✓</Chip>
            </div>
          </div>
        </div>

        <HubSeoIntro
          heading={`${page.title} (${code}) past-paper questions — marked instantly`}
          paragraph={`These are real Cambridge ${copy.label} past-paper questions on ${page.title}. Open one, attempt it, then upload your working — MarkScheme grades it against the official ${code} mark scheme so you see exactly where the marks are won and lost on this topic.`}
          links={[
            { href: '/mark', label: 'Mark your answer →', variant: 'primary' },
            ...(lessonHref ? [{ href: lessonHref, label: `Learn ${page.title}`, variant: 'ghost' as const }] : []),
            { href: `/tools/grade-boundary-calculator/${code}`, label: `${code} grade boundaries`, variant: 'muted' as const },
          ]}
        />

        <section aria-labelledby="tq-list" style={{ marginTop: 12 }}>
          <h2 id="tq-list" className="ms-overline" style={{ marginBottom: 12 }}>
            {page.questionCount} past-paper questions on {page.title}
          </h2>
          <ul className="ms-tq-list">
            {page.questions.map((q, i) => (
              <li key={`${q.paperCode}-${q.questionNumber}-${i}`} className="ms-sd-card ms-sd-card-pad ms-tq-item">
                <div className="ms-tq-meta">
                  <span className="ms-tq-paper">{q.paperCode} · {q.sessionLabel}</span>
                  <span className="ms-tq-marks">{q.marks} marks</span>
                </div>
                <p className="ms-tq-stem">{q.stem}</p>
                <Link href={q.markHref} className="ec-btn-underline text-sm">
                  Practise the full question →
                </Link>
              </li>
            ))}
          </ul>
          <p className="ms-micro" style={{ marginTop: 14, color: 'var(--ec-text-faint)' }}>
            Question stems are shortened previews. Open a question to attempt the full version and have it marked.
          </p>
        </section>

        <section className="ms-subject-faq" aria-labelledby="tq-faq">
          <h2 id="tq-faq" className="ms-h3">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {faq.map((item) => (
              <div key={item.q} data-chunk-id={item.q.slice(0, 36)}>
                <dt className="font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {related.length ? (
          <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="More topics">
            <p className="ms-micro" style={{ marginBottom: 12 }}>
              MORE {code} TOPICS
            </p>
            <ul className="flex flex-wrap gap-2">
              {related.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/past-papers/${code}/${t.topicSlug}`}
                    className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/past-papers/${code}`} className="ec-btn-underline mt-4 inline-block text-sm">
              All {code} past papers →
            </Link>
          </nav>
        ) : null}
      </div>
    </MarketingPageShell>
  )
}
