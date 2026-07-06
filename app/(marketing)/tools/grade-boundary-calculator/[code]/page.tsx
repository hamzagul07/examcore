import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { GradeBoundaryCalculator } from '@/components/tools/GradeBoundaryCalculator'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import {
  getGradeBoundaryCalculatorCodes,
  getGradeBoundaryCalculatorPages,
  buildSubjectPageCopy,
  isValidMarkingSubjectCode,
} from '@/lib/seo/programmatic-subjects'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'

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
  const copy = buildSubjectPageCopy(subject)
  return getPageMetadata(`/tools/grade-boundary-calculator/${code}`, {
    title: `${code} ${subject.label} grade calculator (raw marks → grade)`,
    description: `Convert your ${code} ${subject.label} (${copy.level}) raw marks into a Cambridge grade. Enter the official thresholds for your session to see your grade and the marks needed for the next.`,
    keywords: [
      `${code} grade calculator`,
      `${code} grade boundaries`,
      `Cambridge ${subject.label} grade calculator`,
      `${code} raw marks to grade`,
    ],
  })
}

export default async function SubjectGradeCalculatorPage({ params }: Props) {
  const { code } = await params
  const subject = getSubject(code)
  if (!subject) notFound()
  const copy = buildSubjectPageCopy(subject)
  const path = `/tools/grade-boundary-calculator/${code}`
  const guideSlug = getSubjectGuideSlugForCode(code)
  const isAS = copy.level === 'AS-Level'
  const hasMarking = isValidMarkingSubjectCode(code)
  const official = getOfficialBoundaries(code)
  const officialSession = official?.sessions[0]

  const faqs = [
    {
      q: `How do I calculate my ${code} ${subject.label} grade?`,
      a: `Enter your ${code} raw mark, the paper or aggregate total, and the grade thresholds for your session below. The calculator shows your grade, your percentage, and how many marks you need for the next grade up. ${code} boundaries are raw marks set per session.`,
    },
    {
      q: `Where are the ${code} grade boundaries published?`,
      a: `Cambridge releases ${code} ${subject.label} grade thresholds for each session on results day, on the Cambridge International website and via your exams officer. The June 2026 thresholds are published on 13 August 2026 — before then, estimate using recent sessions.`,
    },
    {
      q: `What raw mark do I need for an A in ${code}?`,
      a: `It changes every session — Cambridge sets ${code} boundaries after marking so the standard stays consistent. Use the most recent published thresholds for your components as a guide, then confirm against the official table on results day.`,
    },
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${code} ${subject.label} grade calculator`}
        description={`Convert ${code} ${subject.label} raw marks into a Cambridge grade.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Grade calculator', path: '/tools/grade-boundary-calculator' },
          { name: `${code} ${subject.label}`, path },
        ]}
      />
      <JsonLd data={[faqPageNode(faqs), softwareApplicationNode()]} />

      <MarketingHero
        label={`${code} · ${copy.level}`}
        title={`${code} ${subject.label} grade calculator`}
        lead={`Turn your ${code} ${subject.label} raw marks into a Cambridge grade. Enter the official thresholds for your session for an accurate result — and see exactly how far you are from the next grade.`}
      />

      <MarketingSection className="!pt-0">
        <ResultsDayBanner subjectCode={code} className="mb-8" />

        <aside className="ms-quick-answer">
          <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 8 }}>
            Quick answer
          </p>
          <p className="ms-body-2" style={{ fontSize: 16, color: 'var(--ec-text-primary)' }}>
            {code} {subject.label} is marked across {copy.papers}. Grade thresholds are raw marks set
            each session, so enter the ones from your official table below for an accurate {copy.level}{' '}
            grade.
          </p>
        </aside>

        <GradeBoundaryCalculator defaultLevel={isAS ? 'AS-Level' : 'A-Level'} official={official} />

        {official && officialSession && (
          <div className="mt-12">
            <h2 className="ms-h3">Official {code} grade boundaries</h2>
            <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 680 }}>
              Per-component (per-paper) raw-mark thresholds, taken from the official Cambridge grade
              threshold tables. A* is awarded only on the overall syllabus aggregate, not on a single
              paper, and boundaries change every session.
            </p>
            {official.sessions.map((session) => (
              <div key={session.session} style={{ marginTop: 22 }}>
                <h3 className="ms-h3" style={{ fontSize: '1.1rem' }}>
                  {session.session}{' '}
                  <a href={session.sourceUrl} target="_blank" rel="noopener noreferrer" className="ec-btn-underline" style={{ fontSize: '0.8rem' }}>
                    (official source)
                  </a>
                </h3>
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table className="gb-data-table">
                    <thead>
                      <tr>
                        <th>Component</th><th>Paper</th><th>Max</th>
                        <th>A</th><th>B</th><th>C</th><th>D</th><th>E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.components.map((c) => (
                        <tr key={c.component}>
                          <td className="mono">{code}/{c.component}</td>
                          <td>{c.paper}</td>
                          <td className="mono">{c.max}</td>
                          <td className="mono">{c.thresholds.A}</td>
                          <td className="mono">{c.thresholds.B}</td>
                          <td className="mono">{c.thresholds.C}</td>
                          <td className="mono">{c.thresholds.D}</td>
                          <td className="mono">{c.thresholds.E}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12">
          <h2 className="ms-h3">Reading {code} grade boundaries</h2>
          <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 680 }}>
            For {code} {subject.label}, each component has its own threshold and there is an overall
            aggregate boundary. Boundaries move between sessions with paper difficulty, so always use
            the table for your exact series. See the{' '}
            <Link href="/guides/grade-boundaries" className="ec-btn-underline">
              grade boundaries hub
            </Link>
            {guideSlug ? (
              <>
                {' '}and the{' '}
                <Link href={`/blog/${guideSlug}`} className="ec-btn-underline">
                  {code} past papers guide
                </Link>
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Know why you got that mark</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            Upload your {code} answers and MarkScheme marks them against the real Cambridge scheme —
            mark by mark, so you know where the grade was won or lost.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
              Mark {hasMarking ? `${code} ` : ''}free <ArrowRight className="h-5 w-5" />
            </Link>
            {hasMarking ? (
              <Link href={`/subjects/${code}`} className="ec-btn-ghost ec-btn-ghost--sm">
                {code} on MarkScheme
              </Link>
            ) : null}
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
