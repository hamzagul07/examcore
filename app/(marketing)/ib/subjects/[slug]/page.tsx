import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { Chip } from '@/components/margin-notes'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { getIbSubject, getIbSubjects, getIbSubjectSlugs } from '@/lib/ib/catalog'
import { buildIbSubjectCopy, ibShortName } from '@/lib/seo/ib-seo'
import { getIbSubjectBlogLinks } from '@/lib/seo/ib-subject-blog'
import { getIbResources } from '@/lib/ib/resources'
import { IbResources } from '@/components/ib/IbResources'
import { getIbCourse, getIbCourseLessonsForCatalog } from '@/lib/courses/ib'
import { SubjectChapters } from '@/components/subjects/SubjectChapters'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'

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
    ogImagePath: '/ib/opengraph-image',
  })
}

export default async function IbSubjectPage({ params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) notFound()

  const copy = buildIbSubjectCopy(subject)
  const url = `${SITE_URL}${copy.path}`
  const short = ibShortName(subject)

  const faq = [
    {
      q: `What papers are in IB ${subject.name} ${subject.level}?`,
      a: `IB ${subject.name} at ${subject.level} is assessed by ${subject.papers.join(', ')}, plus internal assessment. ${subject.blurb}`,
    },
    {
      q: `How is IB ${subject.name} marked?`,
      a: `IB uses markbands and assessment criteria rather than Cambridge-style B1/M1/A1 codes — examiners place your response in a level band against descriptors. Our guides show what separates the top band from the middle on each paper.`,
    },
    {
      q: `Where can I find IB ${short} ${subject.level} past papers?`,
      a: `Browse every recent ${subject.name} ${subject.level} exam series on our IB ${short} past-papers page, organised by session and paper, with mark-scheme guidance for each.`,
    },
    ...(getIbCourse(subject.slug)
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
  const blogLinks = getIbSubjectBlogLinks(subject.slug, short)

  return (
    <>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'Subjects', path: '/ib/subjects' },
          { name: `${short} ${subject.level}`, path: copy.path },
        ]}
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
        <Link href="/ib/subjects" className="ec-btn-underline text-[15px]">
          ← All IB subjects
        </Link>

        <div className="ms-sd-head">
          <div className="ms-sd-glyph" aria-hidden>
            {subject.glyph}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 2 }}>
              {subject.name}{' '}
              <em style={{ color: 'var(--ec-text-faint)', fontSize: '0.55em' }}>· IB {subject.level}</em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">Group {subject.groupNumber}</Chip>
              <Chip variant="dim">{subject.group}</Chip>
              <Chip variant="dim">{subject.papers.length} papers</Chip>
            </div>
          </div>
          <Link
            href={`/ib/past-papers/${subject.slug}`}
            className="ec-btn-primary ms-auto shrink-0 px-6 py-3 text-sm"
          >
            Past papers
          </Link>
        </div>

        <HubSeoIntro
          heading={`IB ${subject.name} ${subject.level} — papers & markbands`}
          paragraph={`${subject.blurb} Below are the papers you'll sit and how examiners award marks. Practise past papers, learn the markbands, then check your own answers for feedback.`}
          links={[
            { href: `/ib/past-papers/${subject.slug}`, label: 'Past papers →', variant: 'primary' },
            ...(getIbCourse(subject.slug)
              ? [
                  { href: `/ib/courses/${subject.slug}`, label: `Free ${short} course`, variant: 'ghost' as const },
                  {
                    href: `/ib/past-papers/${subject.slug}#ib-topic-practice`,
                    label: 'Practice by topic',
                    variant: 'ghost' as const,
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

        {communityOn ? (
          <div style={{ marginTop: 32 }}>
            <CommunityEntry
              subjectCode={subject.slug}
              title={`IB ${subject.name} ${subject.level} community`}
            />
          </div>
        ) : null}

        {getIbCourse(subject.slug) ? (
          <SubjectChapters
            code={getIbCourse(subject.slug)!.code}
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
              <ul className="ms-pp-year-list">
                {subject.papers.map((p, i) => (
                  <li key={p} className="ms-sd-card ms-sd-card-pad">
                    <div className="ms-pp-year-head">
                      <span className="ms-pp-year" style={{ fontSize: 18 }}>{p}</span>
                      <span className="ms-pp-paperno">{subject.level}</span>
                    </div>
                    <p className="ms-body-2" style={{ marginTop: 6, color: 'var(--ec-text-secondary)' }}>
                      {i === 0
                        ? 'Practise this paper under timed conditions, then mark against the band descriptors.'
                        : 'Drill the question style, then review the markbands to push into the top band.'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="ms-sd-card ms-sd-card-pad" style={{ background: 'var(--ec-bg-soft)' }}>
              <p className="ms-overline" style={{ marginBottom: 8 }}>
                How IB marking differs
              </p>
              <p className="ms-body-2">
                Unlike Cambridge (B1/M1/A1), IB uses <strong>markbands</strong> — examiners place your
                answer in a level band against descriptors. Knowing the band wording is how you turn a
                5 into a 7.
              </p>
            </div>
            <div className="ms-sd-card ms-sd-card-pad">
              <p className="ms-overline" style={{ marginBottom: 8 }}>
                Check your work
              </p>
              <p className="ms-body-2" style={{ marginBottom: 14 }}>
                Upload a photo of your answer and get structured, criteria-based feedback on where the
                marks are.
              </p>
              <Link href="/mark" className="ec-btn-underline text-sm">
                Get feedback →
              </Link>
            </div>
          </div>
        </div>

        <section className="ms-subject-faq" aria-labelledby="ib-subject-faq">
          <h2 id="ib-subject-faq" className="ms-h3">
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

        {related.length ? (
          <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Related IB subjects">
            <p className="ms-micro" style={{ marginBottom: 12 }}>
              MORE {subject.group.toUpperCase()}
            </p>
            <ul className="flex flex-wrap gap-2">
              {related.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/ib/subjects/${s.slug}`}
                    className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {s.name} {s.level}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/ib" className="ec-btn-underline mt-4 inline-block text-sm">
              All IB subjects →
            </Link>
          </nav>
        ) : null}
      </div>
    </>
  )
}
