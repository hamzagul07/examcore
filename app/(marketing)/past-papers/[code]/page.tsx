import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  learningResourceNode,
  itemListNode,
  faqPageNode,
  howToNode,
} from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import {
  getPastPaperSubject,
  getPastPaperSubjects,
  getPastPaperSubjectCodes,
  buildPastPaperSubjectCopy,
} from '@/lib/seo/past-papers'
import { getCatalogSubject } from '@/lib/subjects-catalog'
import { getCourseSubject } from '@/lib/courses'
import { getTopicQuestionPages } from '@/lib/seo/topic-questions'
import { seasonNameFromSessionCode, sessionCodeToYear } from '@/lib/marking/session'

type Props = { params: Promise<{ code: string }> }

export function generateStaticParams() {
  return getPastPaperSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const subject = getPastPaperSubject(code)
  if (!subject) return {}
  const copy = buildPastPaperSubjectCopy(subject)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: copy.ogImagePath,
  })
}

/** Group a subject's sessions into year -> [{ season, code }] for an archive table. */
function archiveByYear(sessions: string[]) {
  const byYear = new Map<number, { season: string; code: string }[]>()
  for (const code of sessions) {
    const year = sessionCodeToYear(code)
    const season = seasonNameFromSessionCode(code)
    if (!year || !season) continue
    const list = byYear.get(year) ?? []
    list.push({ season, code })
    byYear.set(year, list)
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, seasons]) => ({
      year,
      seasons: seasons.sort((a, b) => a.season.localeCompare(b.season)),
    }))
}

export default async function PastPaperSubjectPage({ params }: Props) {
  const { code } = await params
  const subject = getPastPaperSubject(code)
  if (!subject) notFound()

  const copy = buildPastPaperSubjectCopy(subject)
  const { label, level, structure } = subject
  const accent = getCatalogSubject(code)?.color ?? 'var(--ec-brand)'
  const course = getCourseSubject(code)
  const archive = archiveByYear(structure.sessions)
  const components = [...new Set(structure.papers.flatMap((p) => p.components))].sort()
  const topicPages = getTopicQuestionPages(code)
  const url = `${SITE_URL}${copy.path}`

  const markHref = (session?: string) =>
    `/mark?subject=${code}${session ? `&session=${session}` : ''}`

  const faq = [
    {
      q: `Where can I find ${label} (${code}) past papers?`,
      a: `Every recent ${label} (${code}) exam series is listed below by year and session. Pick a paper to practise it and have your answers marked instantly against the official ${code} mark scheme.`,
    },
    {
      q: `Does MarkScheme have ${code} mark schemes?`,
      a: `Yes. We mark your ${label} answers using the real Cambridge mark scheme for ${code} — method marks, accuracy marks and (where relevant) essay level descriptors — so your score reflects how an examiner would award it.`,
    },
    {
      q: `What's the best way to use ${code} past papers?`,
      a: `Work a full paper under timed conditions, mark yourself strictly, then upload it to MarkScheme to catch the marks you missed. Repeat with the next series and track which topics keep costing you marks.`,
    },
  ]

  const otherSubjects = getPastPaperSubjects()
    .filter((s) => s.code !== code)
    .slice(0, 8)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Past papers', path: '/past-papers' },
          { name: `${label} ${code}`, path: copy.path },
        ]}
      />
      <JsonLd
        data={[
          learningResourceNode({
            name: copy.title,
            description: copy.description,
            url,
            syllabusCode: code,
            topics: structure.papers.map((p) => p.name),
            level,
          }),
          itemListNode({
            name: `${label} ${code} exam series`,
            items: archive.flatMap((y) =>
              y.seasons.map((s) => ({
                name: `${label} ${code} — ${s.season} ${y.year}`,
                url: `${SITE_URL}${markHref(s.code)}`,
              }))
            ),
          }),
          howToNode({
            name: `How to revise with ${code} past papers`,
            description: `Get the most out of ${label} (${code}) past papers.`,
            url,
            steps: [
              { name: 'Pick a series', text: `Choose a ${label} paper and year below.` },
              { name: 'Work it timed', text: 'Attempt the full paper under exam conditions.' },
              { name: 'Mark it', text: `Upload your answers — MarkScheme scores them against the ${code} mark scheme.` },
              { name: 'Fix weak topics', text: 'Review where you lost marks and drill those topics.' },
            ],
          }),
          faqPageNode(faq, {
            speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'],
          }),
        ]}
      />

      <div
        className="ms-pg ms-subjects-page"
        style={{ '--sc': accent, paddingTop: 48 } as CSSProperties}
      >
        <Link href="/past-papers" className="ec-btn-underline text-[15px]">
          ← All past papers
        </Link>

        <div className="ms-sd-head">
          <div className="ms-sd-glyph" aria-hidden>
            {subject.glyph}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 2 }}>
              {label} past papers{' '}
              <em style={{ color: 'var(--ec-text-faint)', fontSize: '0.6em' }}>· {code}</em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">{subject.yearRange}</Chip>
              <Chip variant="dim">CAIE · {level}</Chip>
              <Chip variant="dim">{subject.componentCount} papers</Chip>
              {subject.hasMarking ? <Chip variant="ok">instant marking ✓</Chip> : null}
            </div>
          </div>
          <Link href={markHref()} className="ec-btn-primary ms-auto shrink-0 px-6 py-3 text-sm">
            Mark a {code} paper
          </Link>
        </div>

        <HubSeoIntro
          headingLevel="h2"
          heading={`${label} (${code}) past papers — marked, not just downloaded`}
          paragraph={`Below is every recent ${label} exam series we cover (${subject.yearRange}). Practise any paper, then upload photos of your handwriting and MarkScheme grades it against the real ${code} mark scheme — so you get feedback on method and accuracy marks, not just a model answer.`}
          links={[
            { href: markHref(), label: `Mark ${code} now →`, variant: 'primary' },
            ...(subject.hasMarking
              ? [{ href: `/subjects/${code}`, label: `About ${code} marking`, variant: 'ghost' as const }]
              : []),
            ...(course
              ? [{ href: course.path, label: `Free ${code} course`, variant: 'muted' as const }]
              : []),
          ]}
        />

        <div className="ms-sd-grid">
          <div>
            <section aria-labelledby="pp-archive">
              <h2 id="pp-archive" className="ms-overline" style={{ marginBottom: 12 }}>
                Papers by exam series
              </h2>
              <ul className="ms-pp-year-list">
                {archive.map((y) => (
                  <li key={y.year} className="ms-sd-card ms-sd-card-pad">
                    <div className="ms-pp-year-head">
                      <span className="ms-pp-year">{y.year}</span>
                      <span className="ms-pp-paperno">
                        Papers {components.join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                      {y.seasons.map((s) => (
                        <Link
                          key={s.code}
                          href={markHref(s.code)}
                          className="ec-chip-warm"
                          style={{ textDecoration: 'none' }}
                        >
                          {s.season} {y.year} →
                        </Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex flex-col gap-[18px]">
            {course ? (
              <div className="ms-sd-card ms-sd-card-pad">
                <p className="ms-overline" style={{ marginBottom: 8 }}>
                  Free course
                </p>
                <h2 className="ms-h3" style={{ fontSize: 20 }}>
                  {label} — full syllabus
                </h2>
                <p className="ms-body-2" style={{ margin: '6px 0 16px' }}>
                  Stuck on a topic in a past paper? Every syllabus point has a visual
                  lesson with a real exam question.
                </p>
                <Link href={course.path} className="ec-btn-ghost text-sm">
                  Open the {code} course →
                </Link>
              </div>
            ) : null}

            <div className="ms-sd-card ms-sd-card-pad" style={{ background: 'var(--ec-bg-soft)' }}>
              <p className="ms-overline" style={{ marginBottom: 8 }}>
                Grade boundaries
              </p>
              <p className="ms-body-2" style={{ marginBottom: 14 }}>
                Turn your past-paper score into a predicted {code} grade.
              </p>
              <Link
                href={`/tools/grade-boundary-calculator/${code}`}
                className="ec-btn-underline text-sm"
              >
                {code} grade boundary calculator →
              </Link>
            </div>
          </div>
        </div>

        {topicPages.length ? (
          <section aria-labelledby="pp-topics" style={{ marginTop: 40 }}>
            <h2 id="pp-topics" className="ms-h3" style={{ marginBottom: 6 }}>
              {label} past-paper questions by topic
            </h2>
            <p className="ms-body-2" style={{ marginBottom: 16, color: 'var(--ec-text-secondary)' }}>
              Drill {code} past-paper questions one topic at a time — each set is marked against the real scheme.
            </p>
            <ul className="ms-pp-topic-grid">
              {topicPages.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/past-papers/${code}/${t.topicSlug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--ec-border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {t.title}
                    <span style={{ color: 'var(--ec-text-faint)' }}>{t.questionCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : course ? (
          <section aria-labelledby="pp-course-topics" style={{ marginTop: 40 }}>
            <h2 id="pp-course-topics" className="ms-h3" style={{ marginBottom: 6 }}>
              Revise {label} by syllabus topic
            </h2>
            <p className="ms-body-2" style={{ marginBottom: 16, color: 'var(--ec-text-secondary)' }}>
              Every {code} syllabus point has a free lesson with exam tips and a past-paper practice link —
              start with the topic you are revising today.
            </p>
            <Link href={course.path} className="ec-btn-primary inline-flex min-h-[44px]">
              Open free {code} course →
            </Link>
          </section>
        ) : null}

        <section className="ms-subject-faq" aria-labelledby="pp-subject-faq">
          <h2 id="pp-subject-faq" className="ms-h3">
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

        <nav
          className="mt-12 border-t border-[var(--ec-border)] pt-8"
          aria-label="Other past papers"
        >
          <p className="ms-micro" style={{ marginBottom: 12 }}>
            MORE PAST PAPERS
          </p>
          <ul className="flex flex-wrap gap-2">
            {otherSubjects.map((s) => (
              <li key={s.code}>
                <Link
                  href={`/past-papers/${s.code}`}
                  className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {s.code} {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/past-papers" className="ec-btn-underline mt-4 inline-block text-sm">
            All past papers →
          </Link>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
