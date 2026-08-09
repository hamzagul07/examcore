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
import { buildTopicQuestionCopy } from '@/lib/seo/topic-questions'
import {
  getAllExpandedTopicQuestionParams,
  getExpandedTopicQuestionPage,
  getExpandedTopicQuestionPages,
} from '@/lib/seo/topic-questions-expand'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { getCourseSubject } from '@/lib/courses'
import { GuestSignupGate } from '@/components/auth/GuestSignupGate'
import { caieLessonPath } from '@/lib/seo/caie-graph'

type Props = { params: Promise<{ code: string; topic: string }> }

export function generateStaticParams() {
  return getAllExpandedTopicQuestionParams()
}

export async function generateMetadata({ params }: Props) {
  const { code, topic } = await params
  const page = getExpandedTopicQuestionPage(code, topic)
  if (!page) return {}
  const copy = buildTopicQuestionCopy(code, page)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: '/api/og/page/past-papers',
  })
}

export default async function TopicQuestionsPage({ params }: Props) {
  const { code, topic } = await params
  const page = getExpandedTopicQuestionPage(code, topic)
  if (!page) notFound()

  const copy = buildTopicQuestionCopy(code, page)
  const accent = getCatalogSubject(code)?.color ?? 'var(--ec-brand)'
  const course = getCourseSubject(code)
  const graphLesson = caieLessonPath(code, page.lessonSlug)
  const lessonHref =
    graphLesson ?? (course ? `/courses/${code}/${page.lessonSlug}` : null)
  const url = `${SITE_URL}${copy.path}`

  const faq = [
    {
      q: `How many ${page.title} questions are there for ${code}?`,
      a:
        page.questionCount > 0
          ? `This page collects ${page.questionCount} recent Cambridge ${copy.label} (${code}) past-paper questions tagged to ${page.title}. Each links straight to instant marking against the official ${code} scheme.`
          : `Open MarkScheme to attempt a real ${code} past-paper question on ${page.title} against the official scheme. Topic-tagged stems are added as we verify them.`,
    },
    {
      q: `How are ${page.title} answers marked?`,
      a: `Type or photograph your working and MarkScheme scores it against the real ${code} mark scheme for this topic — method, accuracy and any band descriptors — so you see exactly where the marks are.`,
    },
    {
      q: `Where can I learn ${page.title} first?`,
      a: lessonHref
        ? `Start with the free ${copy.label} lesson on ${page.title}, then come back and drill past-paper questions under timed conditions.`
        : `Revise the topic, then attempt past-paper questions under timed conditions and mark them against the official scheme.`,
    },
  ]

  const related = getExpandedTopicQuestionPages(code)
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

        <div className="ms-sd-head" data-code={code}>
          <div className="ms-sd-glyph" aria-hidden>
            {page.topicCode}
          </div>
          <div className="min-w-0 flex-1" style={{ position: 'relative', zIndex: 1 }}>
            <p className="ms-overline" style={{ marginBottom: 4 }}>
              {code} · topic questions
            </p>
            <h1 className="ms-h2" style={{ marginBottom: 6 }}>
              {page.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{copy.label}</Chip>
              <Chip variant="ok">
                {page.questionCount > 0
                  ? `${page.questionCount} questions`
                  : 'Mark practice ready'}
              </Chip>
            </div>
          </div>
        </div>

        <GuestSignupGate>
        <section aria-labelledby="tq-list" style={{ marginTop: 12 }}>
          <h2 id="tq-list" className="ms-overline" style={{ marginBottom: 12 }}>
            {page.questionCount > 0
              ? `${page.questionCount} past-paper questions on ${page.title}`
              : `Practise ${page.title} with marking`}
          </h2>
          {page.questions.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="ms-sd-card ms-sd-card-pad">
              <p className="ms-body-2">
                Pick a real {code} past-paper question on syllabus point {page.topicCode}, type or photograph
                your answer, and get Examiner&apos;s Ink against the official scheme.
              </p>
              <Link
                href={`/mark?subject=${encodeURIComponent(code)}&topic=${encodeURIComponent(page.topicCode)}`}
                className="ec-btn-primary mt-4 inline-flex min-h-[44px]"
              >
                Mark a {code} question on this topic →
              </Link>
            </div>
          )}
        </section>

        <HubSeoIntro
          quiet
          headingLevel="h2"
          heading={`${page.title} (${code}) past-paper questions — marked instantly`}
          paragraph={`These are real Cambridge ${copy.label} past-paper questions on ${page.title}. Open one, attempt it, then upload your working — MarkScheme grades it against the official ${code} mark scheme so you see exactly where the marks are won and lost on this topic.`}
          links={[
            { href: '/mark', label: 'Mark your answer →', variant: 'primary' },
            ...(lessonHref ? [{ href: lessonHref, label: `Learn ${page.title}`, variant: 'ghost' as const }] : []),
            { href: `/tools/grade-boundary-calculator/${code}`, label: `${code} grade boundaries`, variant: 'muted' as const },
          ]}
        />

        <section className="ms-subject-faq" aria-labelledby="tq-faq">
          <h2 id="tq-faq" className="ms-h3">
            Frequently asked questions
          </h2>
          <dl className="ms-tool-faq">
            {faq.map((item) => (
              <div key={item.q} data-chunk-id={item.q.slice(0, 36)}>
                <dt>{item.q}</dt>
                <dd className="ms-body-2">{item.a}</dd>
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
                    className="inline-flex rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
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
        </GuestSignupGate>
      </div>
    </MarketingPageShell>
  )
}
