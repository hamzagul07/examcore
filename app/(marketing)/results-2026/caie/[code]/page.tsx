import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { getPageMetadata } from '@/lib/seo/page-meta'
import {
  buildSubjectPageCopy,
  getGradeBoundaryCalculatorCodes,
  getGradeBoundaryCalculatorPages,
} from '@/lib/seo/programmatic-subjects'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { hasSyllabusTree } from '@/lib/syllabi'

type Props = { params: Promise<{ code: string }> }

export function generateStaticParams() {
  return getGradeBoundaryCalculatorCodes().map((code) => ({ code }))
}

function getSubject(code: string) {
  return getGradeBoundaryCalculatorPages().find((s) => s.code === code)
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const subject = getSubject(code)
  if (!subject) return {}
  return getPageMetadata(`/results-2026/caie/${code}`, {
    title: `${code} ${subject.label} Results Day 2026 — thresholds & next steps`,
    description: `Cambridge ${code} ${subject.label} Results Day 2026: interpret raw marks, check grade boundaries, plan remarks or retakes, and practise weak topics with free marking.`,
    keywords: [
      `${code} results 2026`,
      `${code} grade boundaries`,
      `${code} remark`,
      `Cambridge ${subject.label} results`,
    ],
  })
}

export default async function Results2026CaiePage({ params }: Props) {
  const { code } = await params
  const subject = getSubject(code)
  if (!subject) notFound()
  const copy = buildSubjectPageCopy(subject)
  const path = `/results-2026/caie/${code}`
  const official = getOfficialBoundaries(code)
  const guideSlug = getSubjectGuideSlugForCode(code)
  const hasCourse = hasSyllabusTree(code)
  const session = official?.sessions[0]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${code} ${subject.label} Results Day 2026`}
        description={`Interpret ${code} results, boundaries, remarks and retakes.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: `${code} ${subject.label}`, path },
        ]}
      />

      <MarketingHero
        label={`${code} · ${copy.level} · June 2026`}
        title={`${code} ${subject.label} — Results Day`}
        lead={`Check how your ${code} raw marks sit against published thresholds, decide on remarks or retakes, then mark the topics that decide the next grade.`}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/tools/will-my-grade-hold?code=${encodeURIComponent(code)}`}
            className="ec-btn-primary min-h-[48px]"
          >
            Will my {code} grade hold? <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/tools/grade-boundary-calculator/${code}`}
            className="ec-btn-ghost min-h-[48px]"
          >
            {code} calculator
          </Link>
          <Link
            href={`/mark?subject=${encodeURIComponent(code)}`}
            className="ec-btn-ghost min-h-[48px]"
          >
            Mark a {code} question
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <ResultsDayBanner subjectCode={code} className="mb-8" />

        {session ? (
          <div className="ec-card mb-8 p-5">
            <p className="ms-overline">Latest verified session in MarkScheme</p>
            <p className="ms-h3 mt-2" style={{ fontSize: '1.15rem' }}>
              {session.session}
            </p>
            <p className="ms-body-2 mt-2">
              {session.components.length} component
              {session.components.length === 1 ? '' : 's'} loaded. Always confirm against the
              official Cambridge threshold PDF for your centre.
            </p>
            {session.sourceUrl ? (
              <a
                href={session.sourceUrl}
                className="ec-btn-underline mt-3 inline-flex"
                rel="noopener noreferrer"
                target="_blank"
              >
                Official source
              </a>
            ) : null}
          </div>
        ) : (
          <div className="ec-card mb-8 p-5">
            <p className="ms-body-2">
              June 2026 thresholds for {code} will appear here as they are verified. Until then,
              use recent sessions in the calculator and your statement of results.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="ms-h2">Next steps for {code}</h2>
            <ul className="ms-body-2 mt-4 list-disc space-y-2 pl-5">
              <li>Compare each component mark to the published boundary.</li>
              <li>One-mark misses: discuss an enquiry about results with your exams officer quickly.</li>
              <li>
                Retake path: rebuild weak topics in
                {hasCourse ? (
                  <>
                    {' '}
                    <Link href={`/courses/${code}`} className="underline">
                      the free {code} course
                    </Link>
                  </>
                ) : (
                  ' topic practice'
                )}{' '}
                then mark real past-paper questions.
              </li>
              {guideSlug ? (
                <li>
                  Deep dive:{' '}
                  <Link href={`/blog/${guideSlug}`} className="underline">
                    {code} subject guide
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026" syllabusCode={code} />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
