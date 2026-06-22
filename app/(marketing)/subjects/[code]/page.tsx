import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseSubject, getCourseLessons } from '@/lib/courses'
import { SubjectChapters } from '@/components/subjects/SubjectChapters'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import {
  buildSubjectPageCopy,
  getMarkingSubjectCodes,
  getMarkingSubjectPages,
  isValidMarkingSubjectCode,
} from '@/lib/seo/programmatic-subjects'
import { getSubjectByCode } from '@/lib/profile-options'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { learningResourceNode, faqPageNode } from '@/lib/seo/structured-data'
import { SubjectPaperBrowser } from '@/components/subjects/SubjectPaperBrowser'
import { Chip } from '@/components/margin-notes'
import {
  getCatalogSubject,
  subjectLevelChip,
} from '@/lib/subjects-catalog'
import { getSubjectPaperStructure } from '@/lib/subject-papers'
import {
  buildPaperSessionGroups,
  getPaperBrowserYears,
  hotTopicsForSubject,
} from '@/lib/subjects/paper-browser'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { buildSubjectHubIntro } from '@/lib/seo/hub-intro'
import { SITE_URL } from '@/lib/site-config'
import type { CSSProperties } from 'react'

type Props = { params: Promise<{ code: string }> }

export async function generateStaticParams() {
  return getMarkingSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const subject = getSubjectByCode(code)
  if (!subject || !isValidMarkingSubjectCode(code)) return {}
  const copy = buildSubjectPageCopy(subject)
  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: copy.path,
    keywords: copy.keywords,
    ogImagePath: copy.ogImagePath,
  })
}

const SUBJECT_FAQ = (label: string, code: string, level: string) => [
  {
    q: `Can MarkScheme mark ${label} (${code}) handwriting?`,
    a: `Yes — upload photos of your ${level} ${label} answers. We score against Cambridge mark schemes for syllabus ${code}, including method marks and essay bands where applicable.`,
  },
  {
    q: `Do I need the official ${code} mark scheme PDF?`,
    a: `MarkScheme uses mark-scheme logic for ${code}. For your own study, always download the official paper and mark scheme for the same exam series from Cambridge or your school.`,
  },
  {
    q: `Is this a replacement for my teacher?`,
    a: `No — it is a faster second pass when you revise alone. Use strict self-marking first, then MarkScheme to catch what you missed.`,
  },
]

export default async function SubjectProgrammaticPage({ params }: Props) {
  const { code } = await params
  const subject = getSubjectByCode(code)
  if (!subject || !isValidMarkingSubjectCode(code)) notFound()

  const copy = buildSubjectPageCopy(subject)
  const catalog = getCatalogSubject(code)
  const course = getCourseSubject(code)
  const structure = getSubjectPaperStructure(code)
  const url = `${SITE_URL}${copy.path}`
  const faq = SUBJECT_FAQ(subject.label, code, copy.level)
  const otherSubjects = getMarkingSubjectPages()
    .filter((s) => s.code !== code)
    .slice(0, 6)

  const paperSessions = structure
    ? buildPaperSessionGroups(structure, 'all')
    : []
  const paperYears = structure ? getPaperBrowserYears(structure) : []
  const hotTopics = hotTopicsForSubject(structure)
  const accent = catalog?.color ?? 'var(--ec-brand)'
  const lessons = course ? getCourseLessons(code) : []

  const intro = buildSubjectHubIntro(subject)
  const communityOn = isCommunityEnabled()

  return (
    <>
      <PageJsonLd
        path={copy.path}
        title={`${subject.label} ${code} past paper marking`}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Subjects', path: '/subjects' },
          { name: `${subject.label} ${code}`, path: copy.path },
        ]}
      />
      <JsonLd
        data={[
          learningResourceNode({
            name: `${subject.label} (${code}) — Cambridge past paper marking`,
            description: copy.description,
            url,
            syllabusCode: code,
            topics: copy.topics,
            level: copy.level,
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
        <Link href="/subjects" className="ec-btn-underline text-[15px]">
          ← All subjects
        </Link>

        <div className="ms-sd-head">
          <div className="ms-sd-glyph" aria-hidden>
            {catalog?.glyph ?? subject.label.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 2 }}>
              {subject.label}{' '}
              <em
                style={{
                  color: 'var(--ec-text-faint)',
                  fontSize: '0.6em',
                }}
              >
                · {code}
              </em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip variant="dim">
                {catalog?.papers ?? 0} past papers
              </Chip>
              <Chip variant="dim">
                CAIE · {catalog ? subjectLevelChip(catalog) : copy.level}
              </Chip>
              {course ? (
                <Chip variant="ok">free course ✓</Chip>
              ) : (
                <Chip variant="outline">course coming soon</Chip>
              )}
            </div>
          </div>
          <Link
            href="/mark"
            className="ec-btn-primary ms-auto shrink-0 px-6 py-3 text-sm"
          >
            Mark a {code} question
          </Link>
        </div>

        <HubSeoIntro
          heading={intro.heading}
          paragraph={intro.paragraph}
          links={[
            { href: '/mark', label: `Mark ${code} now →`, variant: 'primary' },
            { href: `/past-papers/${code}`, label: `${code} past papers`, variant: 'ghost' as const },
            ...(course
              ? [{ href: course.path, label: `Free ${code} course`, variant: 'ghost' as const }]
              : []),
            ...(copy.guideSlug
              ? [{ href: `/blog/${copy.guideSlug}`, label: `${code} revision guide`, variant: 'muted' as const }]
              : []),
          ]}
        />

        {communityOn ? (
          <div style={{ marginTop: 32 }}>
            <CommunityEntry subjectCode={code} title={`${subject.label} community`} />
          </div>
        ) : null}

        {lessons.length && course ? (
          <SubjectChapters
            code={code}
            lessons={lessons}
            basePath="/courses"
            accent={accent}
            heading={`${subject.label} chapters`}
          />
        ) : null}

        <div className="ms-sd-grid" style={{ marginTop: 40 }}>
          <div>
            {structure && paperSessions.length > 0 ? (
              <SubjectPaperBrowser
                sessions={paperSessions}
                years={paperYears}
              />
            ) : (
              <div className="ms-sd-card ms-sd-card-pad">
                <p className="ms-overline" style={{ marginBottom: 8 }}>
                  Past papers
                </p>
                <p className="ms-body-2">{copy.papers}</p>
                <Link href="/mark" className="ec-btn-primary mt-4 inline-flex">
                  Mark {code} now →
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[18px]">
            {course ? (
              <div className="ms-sd-card ms-sd-card-pad">
                <p className="ms-overline" style={{ marginBottom: 8 }}>
                  Free course
                </p>
                <h2 className="ms-h3" style={{ fontSize: 20 }}>
                  {subject.label} — full syllabus
                </h2>
                <p className="ms-body-2" style={{ margin: '6px 0 16px' }}>
                  Topic-by-topic lessons with a real past-paper question on every
                  syllabus point.
                </p>
                <Link href={course.path} className="ec-btn-ghost text-sm">
                  Open the course →
                </Link>
              </div>
            ) : null}

            <div className="ms-sd-card ms-sd-card-pad">
              <p className="ms-overline" style={{ marginBottom: 6 }}>
                Where students lose marks
              </p>
              {hotTopics.map((topic, i) => (
                <div key={topic} className="ms-topic-row">
                  <span>
                    <span
                      className="font-mono text-xs"
                      style={{
                        color: 'var(--ec-error-ink, var(--ec-score-low))',
                        marginRight: 10,
                      }}
                    >
                      #{i + 1}
                    </span>
                    {topic}
                  </span>
                  <Link
                    href={course ? course.path : '/mark'}
                    className="ec-btn-underline shrink-0 text-[13.5px]"
                  >
                    {course ? 'lesson →' : 'practise →'}
                  </Link>
                </div>
              ))}
            </div>

            <div
              className="ms-sd-card ms-sd-card-pad"
              style={{ background: 'var(--ec-bg-soft)' }}
            >
              <p className="ms-greennote" style={{ fontSize: 20, marginTop: 0 }}>
                {copy.quickAnswer}
              </p>
              {copy.guideSlug ? (
                <Link
                  href={`/blog/${copy.guideSlug}`}
                  className="ec-btn-underline mt-3 inline-block text-sm"
                >
                  {code} revision guide →
                </Link>
              ) : null}
              <Link
                href="/dashboard/progress"
                className="ec-btn-underline mt-2 inline-block text-sm"
              >
                Your {subject.label} progress →
              </Link>
            </div>
          </div>
        </div>

        <section className="ms-subject-faq" aria-labelledby="subject-faq">
          <h2 id="subject-faq" className="ms-h3">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {faq.map((item) => (
              <div key={item.q} data-chunk-id={item.q.slice(0, 36)}>
                <dt className="font-semibold text-[var(--ec-text-primary)]">
                  {item.q}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <nav
          className="mt-12 border-t border-[var(--ec-border)] pt-8"
          aria-label="Other subjects"
        >
          <p className="ms-micro" style={{ marginBottom: 12 }}>
            OTHER SYLLABUSES
          </p>
          <ul className="flex flex-wrap gap-2">
            {otherSubjects.map((s) => (
              <li key={s.code}>
                <Link
                  href={`/subjects/${s.code}`}
                  className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {s.code} {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/subjects" className="ec-btn-underline mt-4 inline-block text-sm">
            All subjects →
          </Link>
        </nav>
      </div>
    </>
  )
}
