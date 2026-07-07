import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, itemListNode, howToNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import {
  getIbSubject,
  getIbSubjects,
  getIbSubjectSlugs,
  IB_SESSIONS,
  ibYearRange,
} from '@/lib/ib/catalog'
import { buildIbPastPaperCopy, ibShortName } from '@/lib/seo/ib-seo'
import { getIbResources } from '@/lib/ib/resources'
import { IbResources } from '@/components/ib/IbResources'
import { getIbCourse } from '@/lib/courses/ib'
import { getIbTopicPracticePages } from '@/lib/seo/ib-topic-practice'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getIbSubjectSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) return {}
  const copy = buildIbPastPaperCopy(subject)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: '/ib/opengraph-image',
  })
}

export default async function IbPastPaperSubjectPage({ params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) notFound()

  const copy = buildIbPastPaperCopy(subject)
  const short = ibShortName(subject)
  const url = `${SITE_URL}${copy.path}`
  const sessions = [...IB_SESSIONS]

  const faq = [
    {
      q: `Where can I find IB ${subject.name} ${subject.level} past papers?`,
      a: `Every recent ${subject.name} ${subject.level} exam series (${ibYearRange()}) is listed below by session, covering ${subject.papers.join(', ')}. Practise each, then mark against the band descriptors.`,
    },
    {
      q: `Does IB ${subject.name} have mark schemes?`,
      a: `Yes — IB publishes mark schemes that use markbands and assessment criteria. Our guides explain how examiners place answers into level bands so you can mark your own work like an examiner.`,
    },
    {
      q: `What's the best way to use ${short} past papers?`,
      a: `Work a full paper under timed conditions, mark yourself strictly against the band descriptors, list every mark you dropped, then drill those skills before the next session.`,
    },
  ]

  const related = getIbSubjects()
    .filter((s) => s.slug !== subject.slug)
    .slice(0, 10)
  const topicPages = getIbTopicPracticePages(slug)
  const course = getIbCourse(slug)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'IB', path: '/ib' },
    { name: 'Past papers', path: '/ib/past-papers' },
    { name: `${short} ${subject.level}`, path: copy.path },
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
            syllabusCode: subject.slug,
            topics: [`IB ${subject.name}`, ...subject.papers],
            level: subject.level === 'HL' ? 'Higher Level' : 'Standard Level',
            curriculum: 'ib',
          }),
          itemListNode({
            name: `IB ${subject.name} ${subject.level} exam series`,
            items: sessions.map((s) => ({
              name: `IB ${subject.name} ${subject.level} — ${s}`,
            })),
          }),
          ...(topicPages.length
            ? [
                itemListNode({
                  name: `IB ${subject.name} ${subject.level} topic practice`,
                  items: topicPages.map((t) => ({
                    name: `${t.topicCode} ${t.title}`,
                    url: `${SITE_URL}/ib/past-papers/${slug}/${t.topicSlug}`,
                  })),
                }),
              ]
            : []),
          howToNode({
            name: `How to revise with IB ${short} past papers`,
            description: `Get the most out of IB ${subject.name} ${subject.level} past papers.`,
            url,
            steps: [
              { name: 'Pick a series', text: `Choose an IB ${subject.name} session and paper below.` },
              { name: 'Work it timed', text: 'Attempt the paper under real exam conditions.' },
              { name: 'Mark to the bands', text: 'Place your answer in a level band against the descriptors.' },
              { name: 'Fix weak skills', text: 'Drill what kept you out of the top band, then repeat.' },
            ],
          }),
          faqPageNode(faq, { speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'] }),
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
            <h1 className="ms-h2" style={{ marginBottom: 2 }}>
              {subject.name} past papers{' '}
              <em style={{ color: 'var(--ec-text-faint)', fontSize: '0.55em' }}>· IB {subject.level}</em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{ibYearRange()}</Chip>
              <Chip variant="dim">Group {subject.groupNumber}</Chip>
              <Chip variant="dim">{subject.papers.join(' · ')}</Chip>
            </div>
          </div>
          <Link href={`/ib/subjects/${subject.slug}`} className="ec-btn-primary ms-auto shrink-0 px-6 py-3 text-sm">
            Subject overview
          </Link>
        </div>

        <HubSeoIntro
          headingLevel="h2"
          heading={`IB ${subject.name} ${subject.level} past papers — by session`}
          paragraph={`Every recent ${subject.name} exam series we cover (${ibYearRange()}), each with ${subject.papers.join(', ')}. Practise a paper, then mark it against the IB band descriptors — that's where the grade is won.`}
          links={[
            { href: '/mark', label: 'Get feedback on your answer →', variant: 'primary' },
            ...(course
              ? [{ href: course.path, label: `Free ${short} course`, variant: 'ghost' as const }]
              : []),
            ...(topicPages.length
              ? [
                  {
                    href: `#ib-topic-practice`,
                    label: 'Practice by topic',
                    variant: 'ghost' as const,
                  },
                ]
              : []),
            { href: `/ib/subjects/${subject.slug}`, label: `About ${short} ${subject.level}`, variant: 'ghost' },
          ]}
        />

        {topicPages.length ? (
          <section aria-labelledby="ib-topic-practice" style={{ marginTop: 32 }}>
            <h2 id="ib-topic-practice" className="ms-h3" style={{ marginBottom: 6 }}>
              Practice by topic
            </h2>
            <p className="ms-body-2" style={{ marginBottom: 16, color: 'var(--ec-text-secondary)', maxWidth: '52ch' }}>
              Criterion-based practice for every syllabus point — revise the lesson, then mark your response
              band-by-band.
            </p>
            <ul className="subj-chapter-grid">
              {topicPages.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/ib/past-papers/${slug}/${t.topicSlug}`}
                    className="subj-chapter"
                  >
                    <span className="subj-chapter-n mono">{t.topicCode}</span>
                    <span className="subj-chapter-title">{t.title}</span>
                    <span className="subj-chapter-go" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="ib-archive" style={{ marginTop: topicPages.length ? 40 : 12 }}>
          <h2 id="ib-archive" className="ms-overline" style={{ marginBottom: 12 }}>
            Papers by exam series
          </h2>
          <ul className="ms-pp-year-list">
            {sessions.map((s) => (
              <li key={s} className="ms-sd-card ms-sd-card-pad">
                <div className="ms-pp-year-head">
                  <span className="ms-pp-year" style={{ fontSize: 19 }}>{s}</span>
                  <span className="ms-pp-paperno">{subject.level}</span>
                </div>
                <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                  {subject.papers.map((p) => (
                    <span key={p} className="ec-chip-warm">
                      {p}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="ms-micro" style={{ marginTop: 14, color: 'var(--ec-text-faint)' }}>
            Practise any paper, then upload your answer for criteria-based feedback while official IB
            mark-scheme marking rolls out.
          </p>
        </section>

        <section className="ms-subject-faq" aria-labelledby="ib-pp-faq">
          <h2 id="ib-pp-faq" className="ms-h3">
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

        <IbResources resources={getIbResources(subject)} heading={`Best free IB ${subject.name} resources`} />

        <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="More IB past papers">
          <p className="ms-micro" style={{ marginBottom: 12 }}>
            MORE IB PAST PAPERS
          </p>
          <ul className="flex flex-wrap gap-2">
            {related.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/ib/past-papers/${s.slug}`}
                  className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {s.name} {s.level}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/ib/past-papers" className="ec-btn-underline mt-4 inline-block text-sm">
            All IB past papers →
          </Link>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
