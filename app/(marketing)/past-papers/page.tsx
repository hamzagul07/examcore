import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { getPastPaperSubjects, type PastPaperSubject } from '@/lib/seo/past-papers'
import { getCatalogSubject } from '@/lib/subjects-catalog'

const PATH = '/past-papers'

export function generateMetadata() {
  return createPageMetadata({
    title: 'Cambridge Past Papers & Mark Schemes',
    description:
      'Browse Cambridge CAIE past papers and mark schemes across A-Level, AS, O-Level and IGCSE. Upload your answers and get instant, mark-scheme-accurate marking on every paper — free to start.',
    path: PATH,
    keywords: [
      'Cambridge past papers',
      'CAIE past papers',
      'A level past papers',
      'O level past papers',
      'past papers and mark schemes',
      'Cambridge mark scheme',
    ],
  })
}

const FAQ = [
  {
    q: 'Are these Cambridge past papers free?',
    a: 'Yes — you can browse every syllabus and practise past-paper questions for free. MarkScheme then scores your handwritten answers against the real Cambridge mark scheme, so you see exactly where the marks are.',
  },
  {
    q: 'Which exam series are covered?',
    a: 'We cover recent May/June, October/November and February/March series across A-Level, AS, O-Level and IGCSE syllabuses. Each subject page lists the years and papers available.',
  },
  {
    q: 'How is this better than just downloading the PDF?',
    a: 'Downloading a paper only gives you the questions. MarkScheme marks your answers against the official scheme — including method marks and essay bands — so you get feedback, not just a model answer.',
  },
]

const LEVEL_ORDER = ['A-Level', 'AS & A-Level', 'O-Level', 'IGCSE', 'Cambridge']

function groupByLevel(subjects: PastPaperSubject[]): [string, PastPaperSubject[]][] {
  const groups = new Map<string, PastPaperSubject[]>()
  for (const s of subjects) {
    const list = groups.get(s.level) ?? []
    list.push(s)
    groups.set(s.level, list)
  }
  return [...groups.entries()].sort(
    (a, b) => LEVEL_ORDER.indexOf(a[0]) - LEVEL_ORDER.indexOf(b[0])
  )
}

export default function PastPapersHubPage() {
  const subjects = getPastPaperSubjects()
  const grouped = groupByLevel(subjects)
  const totalPapers = subjects.reduce(
    (sum, s) => sum + s.componentCount * s.structure.sessions.length,
    0
  )

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Cambridge Past Papers & Mark Schemes"
        description="Browse Cambridge CAIE past papers and mark schemes with instant, mark-scheme-accurate marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Past papers', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'Cambridge Past Papers & Mark Schemes',
            description:
              'A directory of Cambridge CAIE past papers and mark schemes with instant marking, across A-Level, AS, O-Level and IGCSE.',
            hasPart: subjects.map((s) => ({
              name: `${s.label} (${s.code}) past papers`,
              url: `${SITE_URL}/past-papers/${s.code}`,
            })),
          }),
          itemListNode({
            name: 'Cambridge subjects with past papers',
            items: subjects.map((s) => ({
              name: `${s.label} (${s.code}) past papers`,
              url: `${SITE_URL}/past-papers/${s.code}`,
              description: `${s.level} · ${s.yearRange}`,
            })),
          }),
          faqPageNode(FAQ, {
            speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'],
          }),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48 } as CSSProperties}>
        <h1 className="ms-h2" style={{ marginBottom: 8 }}>
          Cambridge past papers &amp; mark schemes
        </h1>
        <p className="ms-lead" style={{ maxWidth: '46ch' }}>
          Practise real Cambridge exam questions and get them marked instantly against
          the official scheme — across {subjects.length} syllabuses and{' '}
          {totalPapers.toLocaleString()}+ papers.
        </p>

        <HubSeoIntro
          heading="Don't just download papers — get them marked"
          paragraph="A PDF only shows you the questions and a model answer. MarkScheme reads photos of your own handwriting and scores them against the real Cambridge mark scheme — method marks, accuracy marks and essay bands included. Pick a subject below, choose a paper, and see exactly where you're winning and dropping marks."
          links={[
            { href: '/mark', label: 'Mark a paper now →', variant: 'primary' },
            { href: '/subjects', label: 'Browse subjects', variant: 'ghost' },
            { href: '/tools/grade-boundary-calculator', label: 'Grade boundaries', variant: 'muted' },
          ]}
        />

        {grouped.map(([level, list]) => (
          <section key={level} style={{ marginTop: 40 }} aria-labelledby={`lvl-${level}`}>
            <h2 id={`lvl-${level}`} className="ms-h3" style={{ marginBottom: 16 }}>
              {level} past papers
            </h2>
            <ul className="ms-pp-grid">
              {list.map((s) => {
                const accent = getCatalogSubject(s.code)?.color ?? 'var(--ec-brand)'
                return (
                  <li key={s.code}>
                    <Link
                      href={`/past-papers/${s.code}`}
                      className="ms-pp-card subject-accented"
                      style={{ '--acc': accent } as CSSProperties}
                    >
                      <span className="ms-pp-glyph" aria-hidden>
                        {s.glyph}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="ms-pp-title">
                          {s.label} <em className="ms-pp-code">· {s.code}</em>
                        </span>
                        <span className="ms-pp-meta">
                          {s.yearRange} · {s.componentCount} papers
                        </span>
                      </span>
                      <span className="ms-pp-cta" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        <section className="ms-subject-faq" aria-labelledby="pp-faq" style={{ marginTop: 48 }}>
          <h2 id="pp-faq" className="ms-h3">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} data-chunk-id={item.q.slice(0, 36)}>
                <dt className="font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Related">
          <div className="flex flex-wrap gap-2">
            <Chip variant="dim">
              <Link href="/subjects">All subjects</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/courses">Free courses</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/tools/grade-boundary-calculator">Grade boundary calculator</Link>
            </Chip>
          </div>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
