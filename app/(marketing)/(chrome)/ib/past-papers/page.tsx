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
import { getIbCourse } from '@/lib/courses/ib'
import { getIbTopicPracticeSubjectSlugs } from '@/lib/seo/ib-topic-practice'
import { IbSubjectDirectoryClient } from '@/components/subjects/IbSubjectDirectoryClient'

const PATH = '/ib/past-papers'

export function generateMetadata() {
  return createPageMetadata({
    title: 'IB Past Papers & Mark Schemes — All Subjects',
    description:
      'Browse IB Diploma past papers and mark schemes for every HL and SL subject, organised by exam session and paper. Markband guides and revision help — free on MarkScheme.',
    path: PATH,
    keywords: [
      'IB past papers',
      'IB past papers and mark schemes',
      'IBDP past papers',
      'IB HL past papers',
      'IB SL past papers',
      'IB mark scheme',
    ],
  })
}

const FAQ = [
  {
    q: 'Are IB past papers free here?',
    a: 'Yes — browse every IBDP subject at HL and SL by exam session and paper for free, with mark-scheme and markband guidance for each so you know how examiners award marks.',
  },
  {
    q: 'Which IB sessions are covered?',
    a: `We cover recent May and November exam series (${ibYearRange()}). Each subject page lists the available sessions and papers.`,
  },
  {
    q: 'How should I use IB past papers?',
    a: 'Work a paper under timed conditions, then mark yourself against the band descriptors — not just a model answer. Repeat across sessions and track which papers keep costing you marks.',
  },
]

export default function IbPastPapersHubPage() {
  const subjects = getIbSubjects()
  const grouped = getIbSubjectsByGroup()
  const topicPracticeSlugs = new Set(getIbTopicPracticeSubjectSlugs())
  const yearRange = ibYearRange()
  const metaBySlug = Object.fromEntries(
    subjects.map((s) => {
      const course = getIbCourse(s.slug)
      const hasTopics = topicPracticeSlugs.has(s.slug)
      const extras = [
        course ? 'Free course' : null,
        hasTopics ? 'Topic practice' : null,
      ].filter(Boolean)
      return [
        s.slug,
        `${yearRange} · ${s.papers.length} papers${
          extras.length ? ` · ${extras.join(' · ')}` : ''
        }`,
      ]
    })
  )

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="IB Past Papers & Mark Schemes"
        description="Browse IBDP past papers and mark schemes for every HL and SL subject."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'Past papers', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'IB Past Papers & Mark Schemes',
            description: 'A directory of IB Diploma past papers and mark schemes across all HL and SL subjects.',
            hasPart: subjects.map((s) => ({
              name: `IB ${ibShortName(s)} ${s.level} past papers`,
              url: `${SITE_URL}/ib/past-papers/${s.slug}`,
            })),
          }),
          itemListNode({
            name: 'IB subjects with past papers',
            items: subjects.map((s) => ({
              name: `IB ${s.name} ${s.level} past papers`,
              url: `${SITE_URL}/ib/past-papers/${s.slug}`,
            })),
          }),
          faqPageNode(FAQ, { speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'] }),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48 } as CSSProperties}>
        <Link href="/ib" className="ec-btn-underline text-[15px]">
          ← IB home
        </Link>
        <h1 className="ms-h2" style={{ margin: '8px 0 8px' }}>
          IB past papers &amp; mark schemes
        </h1>
        <p className="ms-lead" style={{ maxWidth: '46ch' }}>
          Every IBDP subject, HL and SL, by exam session and paper ({ibYearRange()}) — with markband
          guidance so practice actually moves your grade.
        </p>

        <IbSubjectDirectoryClient
          grouped={grouped}
          hrefPrefix="/ib/past-papers"
          metaBySlug={metaBySlug}
        />

        <HubSeoIntro
          quiet
          headingLevel="h2"
          heading="Past papers, by session and paper"
          paragraph="Pick a subject above to see its papers laid out by exam series. Work each under timed conditions, mark yourself against the band descriptors, and use the guidance to close the gap to a 7."
          links={[
            { href: '/ib/subjects', label: 'Browse IB subjects', variant: 'primary' },
            { href: '/ib/courses', label: 'Free IB courses', variant: 'ghost' },
            { href: '/mark', label: 'Get feedback on your answer', variant: 'ghost' },
            { href: '/blog/ib-free-courses-guide', label: 'Free courses guide', variant: 'muted' },
          ]}
        />

        <section className="ms-subject-faq" aria-labelledby="ibpp-faq" style={{ marginTop: 48 }}>
          <h2 id="ibpp-faq" className="ms-h3">
            Frequently asked questions
          </h2>
          <dl className="ms-tool-faq">
            {FAQ.map((item) => (
              <div key={item.q} data-chunk-id={item.q.slice(0, 36)}>
                <dt>{item.q}</dt>
                <dd className="ms-body-2">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Related">
          <div className="flex flex-wrap gap-2">
            <Chip variant="dim">
              <Link href="/ib">IB home</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/ib/subjects">IB subjects</Link>
            </Chip>
            <Chip variant="dim">
              <Link href="/ib/courses">Free IB courses</Link>
            </Chip>
          </div>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
