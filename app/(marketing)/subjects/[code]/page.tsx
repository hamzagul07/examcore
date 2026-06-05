import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseSubject } from '@/lib/courses'
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
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SITE_URL } from '@/lib/site-config'

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
    keywords: [
      `${code} past papers`,
      `Cambridge ${subject.label} marking`,
      `${copy.level} ${subject.label}`,
    ],
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
  const course = getCourseSubject(code)
  const url = `${SITE_URL}${copy.path}`
  const faq = SUBJECT_FAQ(subject.label, code, copy.level)
  const otherSubjects = getMarkingSubjectPages()
    .filter((s) => s.code !== code)
    .slice(0, 6)

  return (
    <MarketingPageShell>
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
          }),
          faqPageNode(faq),
        ]}
      />

      <MarketingHero
        label={copy.level.toUpperCase()}
        title={
          <span className="gradient-text">
            Mark {subject.label}{' '}
            <span className="font-mono text-[0.85em]">({code})</span> past papers
          </span>
        }
        lead={copy.description}
      />

      <MarketingSection className="!pt-0">
        <aside className="ec-blog-quick-answer mb-10 rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
          <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK ANSWER</p>
          <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
            {copy.quickAnswer}
          </p>
        </aside>

        <div className="ec-card mb-10 p-6 sm:p-8">
          <h2 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">What we mark</h2>
          <ul className="landing-lead list-disc space-y-2 pl-5">
            <li>
              <strong className="text-[var(--ec-text-primary)]">Syllabus:</strong> {code}{' '}
              — {subject.label} ({copy.level})
            </li>
            <li>
              <strong className="text-[var(--ec-text-primary)]">Components:</strong>{' '}
              {copy.papers}
            </li>
            <li>
              <strong className="text-[var(--ec-text-primary)]">Marking style:</strong>{' '}
              {subject.markingType === 'level_of_response'
                ? 'Essay bands & point marks'
                : 'B1 / M1 / A1 and MCQ'}
            </li>
          </ul>
          <Link href="/mark" className="ec-btn-primary mt-6 inline-flex min-h-[48px]">
            Mark {subject.label} now <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="landing-lead mb-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
          {course ? (
            <Link href={course.path} className="ec-link font-semibold">
              Free premium {code} course ({course.lessonCount} topics) →
            </Link>
          ) : null}
          {copy.guideSlug ? (
            <Link href={`/blog/${copy.guideSlug}`} className="ec-link font-semibold">
              {code} past papers &amp; revision guide →
            </Link>
          ) : null}
        </div>

        <section aria-labelledby="subject-faq">
          <h2 id="subject-faq" className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
            Frequently asked questions
          </h2>
          <dl className="space-y-6">
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

        <nav className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-label="Other subjects">
          <p className="ec-label-tech mb-4">OTHER SYLLABUSES</p>
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
          <Link href="/subjects" className="ec-link mt-4 inline-block text-sm">
            All subjects →
          </Link>
        </nav>
      </MarketingSection>
    </MarketingPageShell>
  )
}
