import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { getIbSubject, getIbSubjects, getIbSubjectSlugs } from '@/lib/ib/catalog'
import { buildIbSubjectCopy, ibShortName } from '@/lib/seo/ib-seo'
import { getIbSubjectBlogLinks } from '@/lib/seo/ib-subject-blog'
import { getIbResources } from '@/lib/ib/resources'
import { IbResources } from '@/components/ib/IbResources'
import { getIbCourse, getIbCourseLessonsForCatalog } from '@/lib/courses/ib'
import { getIbCourseSibling } from '@/lib/ib/course-sibling.server'
import { ibCoursePath } from '@/lib/ib/slug-resolve'
import { SubjectChapters } from '@/components/subjects/SubjectChapters'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getIbSubjectSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) return {}
  const copy = buildIbSubjectCopy(subject)
  const course = getIbCourse(subject.slug)
  const description = course
    ? `${copy.description} Free ${course.lessonCount}-lesson course with criterion practice marking.`
    : copy.description
  return createPageMetadata({
    title: copy.title,
    description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: `/api/og/ib/${slug}`,
  })
}

export default async function IbSubjectPage({ params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) notFound()

  const copy = buildIbSubjectCopy(subject)
  const url = `${SITE_URL}${copy.path}`
  const short = ibShortName(subject)
  const course = getIbCourse(subject.slug)
  const sibling = course ? getIbCourseSibling(course.code) : null

  const faq = [
    {
      q: `What papers are in IB ${subject.name} ${subject.level}?`,
      a: `IB ${subject.name} at ${subject.level} is assessed by ${subject.papers.join(', ')}, plus internal assessment. ${subject.blurb}`,
    },
    {
      q: `How is IB ${subject.name} marked?`,
      a: `IB uses markbands and assessment criteria rather than point-based A-Level marking codes — examiners place your response in a level band against descriptors. Our guides show what separates the top band from the middle on each paper.`,
    },
    {
      q: `Where can I find IB ${short} ${subject.level} past papers?`,
      a: `Browse every recent ${subject.name} ${subject.level} exam series on our IB ${short} past-papers page, organised by session and paper, with mark-scheme guidance for each.`,
    },
    ...(course
      ? [
          {
            q: `Is there a free IB ${subject.name} course?`,
            a: `Yes — MarkScheme has a free topic-by-topic IB ${subject.name} course with worked examples, flashcards, and criterion practice marking on every syllabus point.`,
          },
        ]
      : []),
  ]

  const related = getIbSubjects()
    .filter((s) => s.group === subject.group && s.slug !== subject.slug)
    .slice(0, 8)
  const communityOn = isCommunityEnabled()
  const blogLinks = getIbSubjectBlogLinks(subject.slug, short, { hasCourse: Boolean(course) })
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'IB', path: '/ib' },
    { name: 'Subjects', path: '/ib/subjects' },
    { name: `${short} ${subject.level}`, path: copy.path },
  ]

  return (
    <>
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
            name: `IB ${subject.name} ${subject.level} revision resources`,
            items: [
              {
                name: `${short} ${subject.level} past papers`,
                url: `${SITE_URL}/ib/past-papers/${subject.slug}`,
              },
              ...(course
                ? [
                    {
                      name: `Free ${short} course`,
                      url: `${SITE_URL}${ibCoursePath(subject.slug)}`,
                    },
                    {
                      name: `${short} topic practice`,
                      url: `${SITE_URL}/ib/past-papers/${subject.slug}#ib-topic-practice`,
                    },
                  ]
                : []),
              ...blogLinks.map((l) => ({
                name: l.label,
                url: `${SITE_URL}${l.href}`,
              })),
            ],
          }),
          itemListNode({
            name: `IB ${subject.name} ${subject.level} papers`,
            items: subject.papers.map((p) => ({
              name: `IB ${subject.name} ${subject.level} ${p}`,
              description: `${subject.group} · ${subject.level}`,
            })),
          }),
          faqPageNode(faq, { speakableSelectors: ['.ms-subject-faq dt', '.ms-subject-faq dd'] }),
        ]}
      />

      <div
        className="ms-pg ms-subjects-page"
        style={{ '--sc': subject.accent, paddingTop: 48 } as CSSProperties}
      >
        <MarketingBreadcrumbs items={breadcrumbs} className="mb-6" />

        <div className="ms-sd-head" data-code={subject.level}>
          <div className="ms-sd-glyph" aria-hidden>
            {subject.level}
          </div>
          <div className="min-w-0 flex-1" style={{ position: 'relative', zIndex: 1 }}>
            <p className="ms-overline" style={{ marginBottom: 4 }}>
              IB · Group {subject.groupNumber} · {subject.group}
            </p>
            <h1 className="ms-h2" style={{ marginBottom: 6 }}>
              {subject.name}
            </h1>
            <p className="ms-micro">
              {subject.level} · {subject.papers.length} papers
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/mark?subject=ib-${slug.replace(/-(hl|sl)$/i, '')}`}
                className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2"
              >
                <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                  M1
                </span>
                Criterion mark -&gt;
              </Link>
              <Link
                href={`/ib/past-papers/${subject.slug}`}
                className="ec-btn-ghost inline-flex min-h-[44px]"
              >
                Past papers
              </Link>
            </div>
          </div>
        </div>

        {communityOn ? (
          <div style={{ marginTop: 32 }}>
            <CommunityEntry
              subjectCode={subject.slug}
              title={`IB ${subject.name} ${subject.level} community`}
            />
          </div>
        ) : null}

        {course ? (
          <SubjectChapters
            code={course.code}
            lessons={getIbCourseLessonsForCatalog(subject.slug)}
            basePath="/ib/courses"
            accent={subject.accent}
            heading={`${subject.name} ${subject.level} chapters`}
          />
        ) : null}

        <div className="ms-sd-grid">
          <div>
            <section aria-labelledby="ib-papers">
              <h2 id="ib-papers" className="ms-overline" style={{ marginBottom: 12 }}>
                Papers in {subject.name} {subject.level}
              </h2>
              <ul className="ms-board-index ms-board-index--guides">
                {subject.papers.map((p, i) => (
                  <li key={p} className="ms-board-slip">
                    <span className="ms-board-slip__code">{subject.level}</span>
                    <span className="ms-board-slip__body">
                      <span className="ms-board-slip__name">{p}</span>
                      <span className="ms-board-slip__blurb">
                        {i === 0
                          ? 'Practise under timed conditions, then mark against the band descriptors.'
                          : 'Drill the question style, then review the markbands to push into the top band.'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="ms-board-cross">
              <p className="ms-overline">How IB marking differs</p>
              <p className="ms-body-2 mt-2">
                Unlike point-based A-Level mark schemes, IB uses <strong>markbands</strong> — examiners place your
                answer in a level band against descriptors. Knowing the band wording is how you turn a
                5 into a 7.
              </p>
            </div>
            <div className="ms-board-cross">
              <p className="ms-overline">Check your work</p>
              <p className="ms-body-2 mt-2 mb-4">
                Upload a photo of your answer and get structured, criteria-based feedback on where the
                marks are.
              </p>
              <Link
                href={`/mark?subject=ib-${slug.replace(/-(hl|sl)$/i, '')}`}
                className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2"
              >
                <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                  M1
                </span>
                Get feedback -&gt;
              </Link>
            </div>
          </div>
        </div>

        <HubSeoIntro
          quiet
          headingLevel="h2"
          heading={`IB ${subject.name} ${subject.level} — papers & markbands`}
          paragraph={`${subject.blurb} Above are the papers you'll sit and how examiners award marks. Practise past papers, learn the markbands, then check your own answers for feedback.`}
          links={[
            { href: `/ib/past-papers/${subject.slug}`, label: 'Past papers →', variant: 'primary' },
            ...(course
              ? [
                  { href: ibCoursePath(subject.slug), label: `Free ${short} course`, variant: 'ghost' as const },
                  {
                    href: `/ib/past-papers/${subject.slug}#ib-topic-practice`,
                    label: 'Practice by topic',
                    variant: 'ghost' as const,
                  },
                ]
              : []),
            ...(sibling
              ? [
                  {
                    href: sibling.path,
                    label: `IB ${sibling.name} ${sibling.level} course`,
                    variant: 'muted' as const,
                  },
                ]
              : []),
            { href: '/mark', label: 'Get feedback on your answer', variant: 'ghost' },
            ...blogLinks.map((link) => ({
              href: link.href,
              label: link.label,
              variant: 'muted' as const,
            })),
            ...(communityOn
              ? [{ href: `/community/s/${subject.slug}`, label: 'Exam Room community', variant: 'muted' as const }]
              : []),
            { href: '/ib', label: 'All IB subjects', variant: 'muted' },
          ]}
        />

        <section className="ms-subject-faq" aria-labelledby="ib-subject-faq">
          <h2 id="ib-subject-faq" className="ms-h3">
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

        <IbResources resources={getIbResources(subject)} heading={`Best free IB ${subject.name} resources`} />

        {related.length ? (
          <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Related IB subjects">
            <p className="ms-overline" style={{ marginBottom: 12 }}>
              More {subject.group}
            </p>
            <ul className="ms-board-index ms-board-index--guides">
              {related.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/ib/subjects/${s.slug}`}
                    className="ms-board-slip ms-board-slip--compact"
                  >
                    <span className="ms-board-slip__code">{s.level}</span>
                    <span className="ms-board-slip__body">
                      <span className="ms-board-slip__name">{s.name}</span>
                    </span>
                    <span className="ms-board-slip__go" aria-hidden>
                      -&gt;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/ib" className="ec-btn-underline mt-4 inline-block text-sm">
              All IB subjects -&gt;
            </Link>
          </nav>
        ) : null}
      </div>
    </>
  )
}
