import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
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
    <MarketingPageShell>
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

      <MarketingHero label={copy.overline} title={copy.title} lead={copy.lead}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tools/will-my-grade-hold" className="ec-btn-primary min-h-[48px]">
            Will my grade hold? <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/tools/grade-boundary-calculator" className="ec-btn-ghost min-h-[48px]">
            Grade boundary calculator
          </Link>
          <Link href="/blog/cambridge-results-day-august-2026-guide" className="ec-btn-ghost min-h-[48px]">
            Results day guide
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <h2 className="ms-h2">Key dates</h2>
        <ul className="mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
          {deadlines.map((d) => (
            <li key={d.id} className="ec-card p-5">
              <p className="ms-overline">{d.label}</p>
              <p className="ms-h3 mt-2" style={{ fontSize: '1.15rem' }}>
                {d.when}
              </p>
              <p className="ms-body-2 mt-2">{d.detail}</p>
              <p className="ms-micro mt-3">
                {daysUntil(d.utc) === 0 ? 'Today / live' : `${daysUntil(d.utc)} days`}
              </p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">By syllabus</h2>
        <p className="ms-lead mt-3" style={{ maxWidth: '56ch' }}>
          Open your subject for thresholds, interpretation, remark / retake paths, and a
          direct link into free marking.
        </p>
        <ul className="mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <li key={s.code}>
              <Link
                href={s.href}
                className="ec-card flex h-full items-center justify-between gap-3 p-4 transition hover:border-[var(--ec-brand)]"
              >
                <span>
                  <span className="font-semibold">{s.code}</span>
                  <span className="ms-body-2 ml-2">{s.label}</span>
                  {s.hasJune2026 ? (
                    <span className="ms-micro mt-1 block text-[var(--ec-brand)]">
                      June 2026 data ready
                    </span>
                  ) : null}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/results-2026/ib" className="ec-btn-underline">
            IB Diploma results &amp; points
          </Link>
          <Link href="/results-2026/edexcel" className="ec-btn-underline">
            Edexcel International results
          </Link>
        </p>
        <EdexcelWrongBoardBridge className="!mt-6" />
      </MarketingSection>

      <MarketingSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="ms-h2">Remarks &amp; retakes</h2>
            <ul className="ms-body-2 mt-4 list-disc space-y-2 pl-5">
              <li>Ask your exams officer about priority vs standard enquiry about results (EAR).</li>
              <li>Compare your mark to the published boundary — a one-mark miss is the highest-intent case for a remark.</li>
              <li>November / next June retakes: practise the exact topics that lost marks with scheme-aligned marking.</li>
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
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">FAQ</h2>
        <dl className="mt-6 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="ec-card p-5">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="ms-body-2 mt-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </MarketingSection>
    </MarketingPageShell>
  )
}
