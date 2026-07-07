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
    ogImagePath: '/ib/opengraph-image',
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

        <div className="ms-sd-head">
          <div className="ms-sd-glyph" aria-hidden>
            {subject.glyph}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 4 }}>
              {page.title}{' '}
              <em style={{ color: 'var(--ec-text-faint)', fontSize: '0.55em' }}>
                · IB {short} {subject.level}
              </em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{subject.name}</Chip>
              <Chip variant="dim">Topic {page.topicCode}</Chip>
              <Chip variant="dim">{page.paper}</Chip>
            </div>
          </div>
        </div>

        <HubSeoIntro
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

        <section className="ms-subject-faq" aria-labelledby="ib-topic-faq" style={{ marginTop: 40 }}>
          <h2 id="ib-topic-faq" className="ms-h3">
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
              MORE {short.toUpperCase()} {subject.level} TOPICS
            </p>
            <ul className="flex flex-wrap gap-2">
              {related.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/ib/past-papers/${slug}/${t.topicSlug}`}
                    className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
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
        </GuestSignupGate>
      </div>
    </MarketingPageShell>
  )
}
