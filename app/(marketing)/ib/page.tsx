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
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'
import { getIbSubjects, getIbSubjectsByGroup, getIbSubject, ibYearRange } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'
import { IB_GLOBAL_RESOURCES } from '@/lib/ib/resources'
import { IbResources } from '@/components/ib/IbResources'
import { getIbCourse, getIbCourseSlugs } from '@/lib/courses/ib'
import { IB_COURSES_CATALOG_BLURB, IB_NEW_COURSE_SLUGS, ibCourseEntriesByTrack } from '@/lib/courses/ib-catalog-display'
import { getIbTopicPracticeSubjectSlugs } from '@/lib/seo/ib-topic-practice'

const PATH = '/ib'

export function generateMetadata() {
  return createPageMetadata({
    title: 'IB Diploma Past Papers, Courses & Mark Schemes',
    description:
      'Browse IB Diploma (IBDP) past papers and mark schemes for every HL and SL subject — plus free topic-by-topic courses with criterion practice marking. Markband guides, exam tips and revision help. Free on MarkScheme.',
    path: PATH,
    keywords: [
      'IB past papers',
      'IB Diploma past papers',
      'IBDP past papers',
      'IB mark scheme',
      'IB HL SL past papers',
      'IB markbands',
      'free IB course',
      'IB TOK course',
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
  {
    q: 'Are there free IB courses on MarkScheme?',
    a: 'Yes — 44 free IB Diploma courses with 760+ topic-by-topic lessons across sciences, humanities, languages, maths, Core, and Group 6 arts. Each lesson links to criterion practice marking.',
  },
  {
    q: 'How do I practise one syllabus topic at a time?',
    a: 'Open any subject past-papers page and use Practice by topic — each syllabus point links to a free lesson and a criterion marking task. Example: Biology HL topic practice grid.',
  },
]

export default function IbHubPage() {
  const subjects = getIbSubjects()
  const grouped = getIbSubjectsByGroup()
  const courses = getIbCourseSlugs()
    .map((slug) => getIbCourse(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .sort((a, b) => a.name.localeCompare(b.name))

  const courseTracks = ibCourseEntriesByTrack(courses)
  const topicPracticeSlugs = new Set(getIbTopicPracticeSubjectSlugs())

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
          ...(courses.length
            ? [
                itemListNode({
                  name: 'Free IB Diploma courses',
                  items: courses.map((c) => ({
                    name: `IB ${c.name} ${c.level} course`,
                    url: `${SITE_URL}${c.path}`,
                    description: `${c.lessonCount} lessons`,
                  })),
                }),
              ]
            : []),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48 } as CSSProperties}>
        <MarketingBreadcrumbs
          items={[
            { name: 'Home', path: '/' },
            { name: 'IB', path: PATH },
          ]}
          className="mb-4"
        />
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
            { href: '/ib/courses', label: 'Free IB courses', variant: 'ghost' },
            { href: '/guides/ib', label: 'Study guides', variant: 'muted' },
            { href: '/ib/topic-practice', label: 'Topic practice', variant: 'muted' },
            { href: '/mark', label: 'Criterion marking', variant: 'muted' },
          ]}
        />

        {courses.length ? (
          <section style={{ marginTop: 40 }} aria-labelledby="ib-courses">
            <h2 id="ib-courses" className="ms-h3" style={{ marginBottom: 6 }}>
              Free IB courses
            </h2>
            <p className="ms-body-2" style={{ marginBottom: 16, color: 'var(--ec-text-secondary)', maxWidth: '52ch' }}>
              Full topic-by-topic courses built for the current IB syllabus — worked examples, markband
              tips and flashcards on every page. Free, no sign-up.
            </p>
            {courseTracks.map((track) => (
                <div key={track.key} style={{ marginBottom: 24 }}>
                  <h3 className="ms-overline" style={{ marginBottom: 12 }}>
                    {track.label}
                  </h3>
                  <ul className="ms-pp-grid">
                    {track.items.map((c) => {
                      const subject = getIbSubject(c.ibSlug)
                      const isNew = IB_NEW_COURSE_SLUGS.has(c.code)
                      const hasTopics = topicPracticeSlugs.has(c.ibSlug)
                      const meta = [
                        `${c.lessonCount} lessons`,
                        'free course',
                        hasTopics ? 'topic practice' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <li key={c.code}>
                          <Link
                            href={c.path}
                            className="ms-pp-card subject-accented"
                            style={
                              subject
                                ? ({ '--acc': subject.accent } as CSSProperties)
                                : undefined
                            }
                          >
                            <span className="ms-pp-glyph" aria-hidden>
                              {subject?.glyph ?? '◆'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="ms-pp-title">
                                {c.name} <em className="ms-pp-code">· {c.level}</em>
                                {isNew ? (
                                  <span className="ms-pp-new" aria-label="New course">
                                    New
                                  </span>
                                ) : null}
                              </span>
                              <span className="ms-pp-meta">{meta}</span>
                            </span>
                            <span className="ms-pp-cta" aria-hidden>
                              →
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
          </section>
        ) : null}

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
