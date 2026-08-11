import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { getPageMetadata } from '@/lib/seo/page-meta'
import {
  buildSubjectPageCopy,
  getGradeBoundaryCalculatorCodes,
  getGradeBoundaryCalculatorPages,
} from '@/lib/seo/programmatic-subjects'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { ResultsThreadCta } from '@/components/community/ResultsThreadCta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { WillMyGradeHold } from '@/components/tools/WillMyGradeHold'
import { FunnelLandingView } from '@/components/analytics/FunnelLandingView'
import { hasSyllabusTree } from '@/lib/syllabi'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'
import { ToolsDeskArtefact } from '@/components/tools/ToolsDeskArtefact'

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
    title: `${code} ${subject.label} Results Day 2026 — Will My Grade Hold?`,
    description: `Cambridge ${code} ${subject.label} Results Day 2026: check if your grade holds against May/June thresholds, plan remarks/retakes, mark weak topics free.`,
    keywords: [
      `${code} results 2026`,
      `${code} grade boundaries`,
      `${code} grade boundaries 2026`,
      `${code} remark`,
      `Cambridge ${subject.label} results`,
      'will my grade hold',
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
  const defaultLevel =
    subject.levels.includes('AS-Level') && !subject.levels.includes('A-Level')
      ? 'AS-Level'
      : 'A-Level'
  const faqs = [
    {
      q: `When are Cambridge ${code} results 2026?`,
      a: `AS & A Level grades for the June 2026 series release 11 August 2026 (06:00 GMT). Component grade threshold tables typically follow around 13 August. IGCSE/O Level grades release 18 August.`,
    },
    {
      q: `How do I check if my ${code} grade will hold?`,
      a: `Enter your ${code} raw mark and the published (or recent-session) thresholds in the checker on this page. It shows the predicted grade and marks to the next boundary. Always confirm against your official statement.`,
    },
    {
      q: `Where are ${code} grade boundaries 2026?`,
      a: `Official component thresholds publish with Cambridge's June 2026 threshold PDFs (~13 August). Until then, estimate with recent sessions in the calculator, then stress-test sensitivity with Will my grade hold?`,
    },
  ]

  return (
    <>
      <FunnelLandingView source="results-2026-caie" subject={code} />
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
      <JsonLd data={faqPageNode(faqs)} />

      <ToolInstrumentShell
        stamp={code.slice(0, 2)}
        label={`${code} · ${copy.level} · June 2026`}
        title={
          <>
            {code} {subject.label} — <em>Results Day</em>
          </>
        }
        lead={`Check how your ${code} raw marks sit against published thresholds, decide on remarks or retakes, then mark the topics that decide the next grade.`}
        note="paste the thresholds — then decide on the remark"
        artefact={<ToolsDeskArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: code, path },
        ]}
        actions={
          <>
            <a
              href="#grade-hold"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              Will my {code} grade hold?
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </a>
            <Link
              href={`/tools/grade-boundary-calculator/${code}`}
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              {code} calculator
            </Link>
            <Link
              href={`/mark?subject=${encodeURIComponent(code)}`}
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Mark a {code} question
            </Link>
          </>
        }
        after={
          <>
            <ResultsThreadCta source="results-2026-subject" subjectCode={code} className="mb-8" />
            <section className="ms-tool-instrument__faq" aria-labelledby="results-code-faq">
              <h2 id="results-code-faq" className="ms-tool-instrument__faq-title">
                FAQ
              </h2>
              <dl className="ms-tool-faq">
                {faqs.map((f) => (
                  <div key={f.q}>
                    <dt>{f.q}</dt>
                    <dd className="ms-body-2">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        }
      >
        <ResultsDayBanner subjectCode={code} className="mb-8" />

        <div className="mb-8 overflow-x-auto">
          <table className="gb-data-table ms-boundary-hub-table">
            <caption className="sr-only">{code} Results Day 2026 quick answers</caption>
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AS &amp; A Level grades</td>
                <td>
                  <strong>11 Aug 2026</strong> (06:00 GMT)
                </td>
              </tr>
              <tr>
                <td>{code} threshold tables</td>
                <td>
                  Typically <strong>~13 Aug</strong> — confirm with your centre PDF
                </td>
              </tr>
              <tr>
                <td>IGCSE / O Level grades</td>
                <td>
                  <strong>18 Aug 2026</strong> (06:00 GMT)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {session ? (
          <aside className="ms-mark-example-slip mb-8">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp" aria-hidden>
                OK
              </span>
              <div className="ms-mark-example-slip__copy">
                <p className="ms-mark-example-slip__title">
                  Latest verified session · {session.session}
                </p>
                <p className="ms-mark-example-slip__lead">
                  {session.components.length} component
                  {session.components.length === 1 ? '' : 's'} loaded. Always confirm against the
                  official Cambridge threshold PDF for your centre.
                </p>
              </div>
            </div>
            {session.sourceUrl ? (
              <a
                href={session.sourceUrl}
                className="ms-mark-example-slip__cta font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
                rel="noopener noreferrer"
                target="_blank"
              >
                Official source -&gt;
              </a>
            ) : null}
          </aside>
        ) : (
          <aside className="ms-mark-example-slip mb-8">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
                …
              </span>
              <div className="ms-mark-example-slip__copy">
                <p className="ms-mark-example-slip__title">Thresholds pending</p>
                <p className="ms-mark-example-slip__lead">
                  June 2026 thresholds for {code} will appear here as they are verified. Until then,
                  use recent sessions in the checker below and your statement of results.
                </p>
              </div>
            </div>
          </aside>
        )}

        <div id="grade-hold" className="mb-10 scroll-mt-24">
          <h2 className="ms-h2">Will my {code} grade hold?</h2>
          <p className="ms-lead mt-3" style={{ maxWidth: '56ch' }}>
            Paste your raw mark and thresholds. See the grade, the gap to the next boundary, then
            grab the November mock pack.
          </p>
          <div className="mt-6">
            <WillMyGradeHold
              code={code}
              subjectLabel={subject.label}
              official={official}
              defaultLevel={defaultLevel}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="ms-h2">Next steps for {code}</h2>
            <ul className="ms-body-2 mt-4 list-disc space-y-2 pl-5">
              <li>Compare each component mark to the published boundary.</li>
              <li>
                One-mark misses: discuss an enquiry about results with your exams officer quickly.
              </li>
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
                    {code} 2026 boundaries guide
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026" syllabusCode={code} />
        </div>
      </ToolInstrumentShell>
    </>
  )
}
