import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { getIbSubject } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'
import { ibCourseContentSlug } from '@/lib/ib/slug-resolve'
import {
  buildIbTopicPracticeCopy,
  getAllIbTopicPracticeParams,
  getIbTopicPracticePage,
  getIbTopicPracticePages,
} from '@/lib/seo/ib-topic-practice'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'
import { GuestSignupGate } from '@/components/auth/GuestSignupGate'
import { PremiumNudge } from '@/components/billing/PremiumNudge'

type Props = { params: Promise<{ slug: string; topic: string }> }

export function generateStaticParams() {
  return getAllIbTopicPracticeParams()
}

export async function generateMetadata({ params }: Props) {
  const { slug, topic } = await params
  const page = getIbTopicPracticePage(slug, topic)
  if (!page) return {}
  const copy = buildIbTopicPracticeCopy(slug, page)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: `/api/og/ib/${slug}`,
    ogType: 'article',
  })
}

export default async function IbTopicPracticePage({ params }: Props) {
  const { slug, topic } = await params
  const subject = getIbSubject(slug)
  const page = getIbTopicPracticePage(slug, topic)
  if (!subject || !page) notFound()

  const copy = buildIbTopicPracticeCopy(slug, page)
  const short = ibShortName(subject)
  const url = `${SITE_URL}${copy.path}`
  const lessonHref = page.lessonSlug
    ? `/ib/courses/${ibCourseContentSlug(slug)}/${page.lessonSlug}`
    : null
  const courseHref = `/ib/courses/${ibCourseContentSlug(slug)}`
  const syllabusCode = `ib-${slug}`

  const faq = [
    {
      q: `How do I practise IB ${subject.name} ${page.title}?`,
      a: `Revise the free lesson on ${page.title} (${page.topicCode}), then submit your response for criterion-based marking. IB examiners use markbands — our /mark tool scores band-by-band against the official descriptors.`,
    },
    {
      q: `What assessment criteria apply to ${page.title}?`,
      a: page.criteriaSummary
        ? `For IB ${subject.name} ${subject.level}, marking uses: ${page.criteriaSummary}. Upload your work to see where your response sits in each band.`
        : `IB ${subject.name} uses markbands and assessment criteria. Upload your answer for structured feedback on ${page.title}.`,
    },
    {
      q: `Is ${page.title} (${page.topicCode}) free on MarkScheme?`,
      a: lessonHref
        ? `Yes — the lesson, flashcards, and criterion practice marking for ${page.title} are 100% free. No sign-up required to start revising.`
        : `Criterion practice marking for ${page.title} is free on MarkScheme.`,
    },
  ]

  const related = getIbTopicPracticePages(slug)
    .filter((t) => t.topicSlug !== topic)
    .slice(0, 12)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'IB', path: '/ib' },
    { name: 'Past papers', path: '/ib/past-papers' },
    { name: `${short} ${subject.level}`, path: `/ib/past-papers/${slug}` },
    { name: page.title, path: copy.path },
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={breadcrumbs}
      />
      <JsonLd
        data={[
          learningResourceNode({
            name: copy.title,
            description: copy.description,
            url,
            syllabusCode,
            topics: [page.title, `IB ${subject.name}`],
            level: copy.level,
            curriculum: 'ib',
          }),
          faqPageNode(faq, {
            speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'],
          }),
        ]}
      />

      <div
        className="ms-pg ms-subjects-page"
        style={{ '--sc': subject.accent, paddingTop: 48 } as CSSProperties}
      >
        <MarketingBreadcrumbs items={breadcrumbs} className="mb-6" />

        <div className="ms-sd-head" data-code={page.topicCode}>
          <div className="ms-sd-glyph" aria-hidden>
            {page.topicCode}
          </div>
          <div className="min-w-0 flex-1" style={{ position: 'relative', zIndex: 1 }}>
            <p className="ms-overline" style={{ marginBottom: 4 }}>
              IB {short} {subject.level} · {page.paper}
            </p>
            <h1 className="ms-h2" style={{ marginBottom: 6 }}>
              {page.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{subject.name}</Chip>
              <Chip variant="dim">Topic {page.topicCode}</Chip>
            </div>
          </div>
        </div>

        <GuestSignupGate>
        <section aria-labelledby="ib-practice-task" style={{ marginTop: 12 }}>
          <h2 id="ib-practice-task" className="ms-overline" style={{ marginBottom: 12 }}>
            Practice task
          </h2>
          <div className="ms-sd-card ms-sd-card-pad">
            <p className="ms-body-2 whitespace-pre-line" style={{ color: 'var(--ec-text-secondary)' }}>
              {page.practicePrompt}
            </p>
            <Link href={page.markHref} className="ec-btn-primary mt-4 inline-flex px-5 py-2.5 text-sm">
              Upload your answer for marking →
            </Link>
          </div>
          {page.criteriaSummary ? (
            <p className="ms-micro mt-3" style={{ color: 'var(--ec-brand)' }}>
              {page.criteriaSummary}
            </p>
          ) : null}
        </section>

        <HubSeoIntro
          quiet
          headingLevel="h2"
          heading={`${page.title} — IB ${subject.name} ${subject.level} practice`}
          paragraph={`Syllabus point ${page.topicCode} on ${page.paperName}. Revise the topic, then upload your response for criterion-based marking — band-by-band feedback against official IB assessment criteria, not a generic AI grade.`}
          links={[
            { href: page.markHref, label: 'Criterion practice →', variant: 'primary' },
            ...(lessonHref
              ? [{ href: lessonHref, label: `Learn ${page.title}`, variant: 'ghost' as const }]
              : []),
            { href: courseHref, label: `Full ${short} course`, variant: 'muted' },
            { href: `/ib/subjects/${slug}`, label: `${short} subject hub`, variant: 'muted' },
          ]}
        />

        <section className="ms-subject-faq" aria-labelledby="ib-topic-faq" style={{ marginTop: 40 }}>
          <h2 id="ib-topic-faq" className="ms-h3">
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
              MORE {short.toUpperCase()} {subject.level} TOPICS
            </p>
            <ul className="flex flex-wrap gap-2">
              {related.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/ib/past-papers/${slug}/${t.topicSlug}`}
                    className="inline-flex rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/ib/past-papers/${slug}`} className="ec-btn-underline mt-4 inline-block text-sm">
              All IB {short} {subject.level} topics →
            </Link>
          </nav>
        ) : null}
        {/* Premium at the end of the guide — client-gated, page stays static. */}
        <PremiumNudge surface="guide" />
        </GuestSignupGate>
      </div>
    </MarketingPageShell>
  )
}
