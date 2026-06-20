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
import { getIbSubjects, getIbSubjectsByGroup, ibYearRange } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'
import { IB_GLOBAL_RESOURCES } from '@/lib/ib/resources'
import { IbResources } from '@/components/ib/IbResources'

const PATH = '/ib'

export function generateMetadata() {
  return createPageMetadata({
    title: 'IB Diploma Past Papers & Mark Schemes',
    description:
      'Browse IB Diploma (IBDP) past papers and mark schemes for every HL and SL subject — by session and paper — with markband guides, exam tips and revision help. Free on MarkScheme.',
    path: PATH,
    keywords: [
      'IB past papers',
      'IB Diploma past papers',
      'IBDP past papers',
      'IB mark scheme',
      'IB HL SL past papers',
      'IB markbands',
    ],
  })
}

const FAQ = [
  {
    q: 'Are these IB past papers free?',
    a: 'Yes — you can browse every IBDP subject at HL and SL, organised by session and paper, for free. Each subject page links to mark-scheme and markband guidance so you know exactly how IB examiners award marks.',
  },
  {
    q: 'What is the difference between HL and SL?',
    a: 'Higher Level (HL) covers more content and usually an extra paper (often Paper 3) with greater depth, while Standard Level (SL) is a lighter syllabus. Each subject page lists the papers for both levels.',
  },
  {
    q: 'How does IB marking work?',
    a: 'IB does not use Cambridge-style B1/M1/A1 codes — it uses markbands and assessment criteria, where examiners place your answer in a level band against descriptors. Our guides explain how to hit the top band on each paper.',
  },
]

export default function IbHubPage() {
  const subjects = getIbSubjects()
  const grouped = getIbSubjectsByGroup()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="IB Diploma Past Papers & Mark Schemes"
        description="Browse IBDP past papers and mark schemes for every HL and SL subject."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'IB Diploma Past Papers & Mark Schemes',
            description:
              'A directory of IB Diploma Programme past papers and mark schemes across all HL and SL subjects.',
            hasPart: subjects.map((s) => ({
              name: `IB ${ibShortName(s)} ${s.level} past papers`,
              url: `${SITE_URL}/ib/subjects/${s.slug}`,
            })),
          }),
          itemListNode({
            name: 'IB Diploma subjects',
            items: subjects.map((s) => ({
              name: `IB ${s.name} ${s.level}`,
              url: `${SITE_URL}/ib/subjects/${s.slug}`,
              description: s.group,
            })),
          }),
          faqPageNode(FAQ, { speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'] }),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48 } as CSSProperties}>
        <h1 className="ms-h2" style={{ marginBottom: 8 }}>
          IB Diploma past papers &amp; mark schemes
        </h1>
        <p className="ms-lead" style={{ maxWidth: '48ch' }}>
          Every IBDP subject, HL and SL, organised by session and paper ({ibYearRange()}) — with
          markband guidance so you know exactly how examiners award the marks.
        </p>

        <HubSeoIntro
          heading="The IB papers, finally organised"
          paragraph="Official IB past papers are scattered and hard to navigate. We lay out every Higher and Standard Level subject by exam series and paper, and explain the markbands and assessment criteria that decide your grade — so practice actually moves your score. Pick a subject below to start."
          links={[
            { href: '/ib/past-papers', label: 'Browse IB past papers →', variant: 'primary' },
            { href: '/ib/subjects', label: 'All IB subjects', variant: 'ghost' },
            { href: '/mark', label: 'Get feedback on your answer', variant: 'muted' },
          ]}
        />

        {grouped.map((g) => (
          <section key={g.group} style={{ marginTop: 40 }} aria-labelledby={`grp-${g.groupNumber}`}>
            <h2 id={`grp-${g.groupNumber}`} className="ms-h3" style={{ marginBottom: 16 }}>
              Group {g.groupNumber} · {g.group}
            </h2>
            <ul className="ms-pp-grid">
              {g.subjects.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/ib/subjects/${s.slug}`}
                    className="ms-pp-card subject-accented"
                    style={{ '--acc': s.accent } as CSSProperties}
                  >
                    <span className="ms-pp-glyph" aria-hidden>
                      {s.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="ms-pp-title">
                        {s.name} <em className="ms-pp-code">· {s.level}</em>
                      </span>
                      <span className="ms-pp-meta">{s.papers.length} papers · {ibYearRange()}</span>
                    </span>
                    <span className="ms-pp-cta" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="ms-subject-faq" aria-labelledby="ib-faq" style={{ marginTop: 48 }}>
          <h2 id="ib-faq" className="ms-h3">
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

        <IbResources resources={IB_GLOBAL_RESOURCES} />

        <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Related">
          <div className="flex flex-wrap gap-2">
            <Chip variant="dim">
              <Link href="/ib/past-papers">IB past papers</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/ib/subjects">IB subjects</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/subjects">Cambridge subjects</Link>
            </Chip>
          </div>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
