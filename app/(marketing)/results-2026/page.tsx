import Link from 'next/link'

import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { FunnelLandingView } from '@/components/analytics/FunnelLandingView'
import { EdexcelWrongBoardBridge } from '@/components/seo/EdexcelWrongBoardBridge'
import {
  getResultsDeadlines,
  getResultsHubCopy,
  getResultsSubjectLinks,
} from '@/lib/seo/results-2026-hub'
import { daysUntil } from '@/lib/seo/results-day'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'
import { ToolsDeskArtefact } from '@/components/tools/ToolsDeskArtefact'
import { ResultsThreadCta } from '@/components/community/ResultsThreadCta'

export const metadata = getPageMetadata('/results-2026', {
  title: 'Cambridge Results Day 2026 — boundaries, remarks, mocks',
  description:
    'Cambridge June 2026 Results Day hub: AS & A Level on 11 August, thresholds ~13 August, IGCSE 18 August. Check will-my-grade-hold, remarks, retakes, and the free November mock pack.',
  keywords: [
    'Cambridge results day 2026',
    'A Level results 11 August 2026',
    'Cambridge grade thresholds 2026',
    'will my grade hold',
    'Cambridge remark retake',
  ],
})

const FAQS = [
  {
    q: 'When are Cambridge AS & A Level results 2026?',
    a: 'AS & A Level results for the June 2026 series are released on Tuesday 11 August 2026 at 06:00 GMT. Grade threshold tables typically follow around 13 August.',
  },
  {
    q: 'How do I check if my grade will hold?',
    a: 'Use MarkScheme’s Will my grade hold? tool: enter your raw mark and the published component thresholds to see your grade and the gap to the next boundary. Always confirm against your official statement of results.',
  },
  {
    q: 'What should I do if I miss a grade?',
    a: 'Talk to your exams officer about remarks (priority vs non-priority) and retake options for November or the next June series. Practise the weak topics with past-paper marking while the paper is still fresh.',
  },
  {
    q: 'What if I take Edexcel International, not Cambridge?',
    a: 'Cambridge threshold tables do not map onto Edexcel IAL unit scores. Use the Edexcel International results hub for UMS / cash-in context, then mark WMA / WME / WST practice with board=edexcel.',
  },
]

export default function Results2026Page() {
  const copy = getResultsHubCopy()
  const deadlines = getResultsDeadlines()
  const subjects = getResultsSubjectLinks().slice(0, 24)
  const path = '/results-2026'

  return (
    <>
      <FunnelLandingView source="results-2026" />
      <PageJsonLd
        path={path}
        title={copy.title}
        description={copy.lead}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path },
        ]}
      />
      <JsonLd data={faqPageNode(FAQS)} />

      <ToolInstrumentShell
        stamp="RD"
        label={copy.overline}
        title={
          <>
            Results Day <em>2026</em>
          </>
        }
        lead={copy.lead}
        note="one mark from the boundary — that's when the checker earns its keep"
        artefact={<ToolsDeskArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path },
        ]}
        actions={
          <>
            <Link
              href="/tools/will-my-grade-hold"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              Will my grade hold?
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link
              href="/tools/grade-boundary-calculator"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Grade boundary calculator
            </Link>
            <Link
              href="/blog/cambridge-results-day-august-2026-guide"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Results day guide
            </Link>
          </>
        }
        after={
          <>
          <ResultsThreadCta source="results-2026" className="mb-8" />
          <section className="ms-tool-instrument__faq" aria-labelledby="results-faq">
            <h2 id="results-faq" className="ms-tool-instrument__faq-title">
              FAQ
            </h2>
            <dl className="ms-tool-faq">
              {FAQS.map((f) => (
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
        <h2 className="ms-h2">Key dates</h2>
        <ul className="ms-date-slips mt-6">
          {deadlines.map((d) => {
            const days = daysUntil(d.utc)
            return (
              <li key={d.id} className="ms-date-slip">
                <span className="ms-date-slip__stamp" aria-hidden>
                  {days === 0 ? 'NOW' : `${days}d`}
                </span>
                <p className="ms-overline">{d.label}</p>
                <p className="ms-h3" style={{ fontSize: '1.15rem', marginTop: 6 }}>
                  {d.when}
                </p>
                <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0 }}>
                  {d.detail}
                </p>
              </li>
            )
          })}
        </ul>

        <h2 className="ms-h2 mt-14">By syllabus</h2>
        <p className="ms-lead mt-3" style={{ maxWidth: '56ch' }}>
          Open your subject for thresholds, interpretation, remark / retake paths, and a direct
          link into free marking.
        </p>
        <div className="ms-tool-instrument__rail mt-5" role="navigation" aria-label="Results by syllabus">
          {subjects.map((s) => (
            <Link
              key={s.code}
              href={s.href}
              className="ms-tool-instrument__stamp-link"
              title={s.label}
            >
              {s.code}
              {s.hasJune2026 ? (
                <span className="sr-only"> — June 2026 data ready — {s.label}</span>
              ) : (
                <span className="sr-only"> — {s.label}</span>
              )}
            </Link>
          ))}
        </div>
        <p className="ms-micro mt-3">
          Green-ready codes have verified June tables where available — always confirm with your
          centre PDF.
        </p>
        <div className="ms-tool-instrument__links mt-5">
          <Link href="/results-2026/ib" className="ec-link">
            IB Diploma results -&gt;
          </Link>
          <Link href="/results-2026/edexcel" className="ec-link">
            Edexcel International -&gt;
          </Link>
        </div>
        <EdexcelWrongBoardBridge className="!mt-6" />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="ms-h2">Remarks &amp; retakes</h2>
            <ul className="ms-body-2 mt-4 list-disc space-y-2 pl-5">
              <li>
                Ask your exams officer about priority vs standard enquiry about results (EAR).
              </li>
              <li>
                Compare your mark to the published boundary — a one-mark miss is the highest-intent
                case for a remark.
              </li>
              <li>
                November / next June retakes: practise the exact topics that lost marks with
                scheme-aligned marking.
              </li>
              <li>
                Start here:{' '}
                <Link href="/tools/will-my-grade-hold" className="underline">
                  Will my grade hold?
                </Link>
              </li>
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026" />
        </div>
      </ToolInstrumentShell>
    </>
  )
}
