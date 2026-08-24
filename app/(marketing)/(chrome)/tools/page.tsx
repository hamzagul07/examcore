import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { softwareApplicationNode } from '@/lib/seo/structured-data'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { ToolsDeskArtefact } from '@/components/tools/ToolsDeskArtefact'

const PATH = '/tools'

type Instrument = {
  href: string
  title: string
  job: string
  cta: string
  stamp: string
  featured?: boolean
}

const INSTRUMENTS: Instrument[] = [
  {
    href: '/tools/will-my-grade-hold',
    title: 'Will my grade hold?',
    job: 'Results Day: paste a raw mark and published thresholds — see the grade, the gap, then take the November mock pack.',
    cta: 'Check my grade',
    stamp: 'A*',
    featured: true,
  },
  {
    href: '/tools/grade-boundary-calculator',
    title: 'Grade boundary calculator',
    job: 'Raw marks in, A*–E out — percentage and marks to the next boundary for every syllabus we mark.',
    cta: 'Open calculator',
    stamp: '∴',
  },
  {
    href: '/tools/command-words',
    title: 'Command words explorer',
    job: 'What state, explain, evaluate, and justify actually ask for — and how to earn the marks.',
    cta: 'Explore words',
    stamp: 'CW',
  },
  {
    href: '/tools/ib-points-calculator',
    title: 'IB points calculator',
    job: 'Six subjects plus TOK/EE bonus — total out of 45 and whether you meet the pass conditions.',
    cta: 'Calculate points',
    stamp: '45',
  },
  {
    href: '/tools/pum-calculator',
    title: 'PUM / UMS calculator',
    job: 'Convert a raw mark to the 0–100 uniform scale using your A–E thresholds.',
    cta: 'Convert to PUM',
    stamp: '%',
  },
  {
    href: '/tools/exam-countdown',
    title: 'Exam countdown & planner',
    job: 'Days left, revision phase, and how many past papers a week to clear your target.',
    cta: 'Start countdown',
    stamp: 'T',
  },
]

export const metadata = getPageMetadata(PATH, {
  ogImagePath: '/api/og/tools/hub',
  title: 'Free revision tools — Cambridge grade & command words',
  description:
    'Free Cambridge revision tools: a grade boundary calculator that turns raw marks into an A*–E grade, and a command words explorer that shows how to answer each question type.',
  keywords: [
    'Cambridge revision tools',
    'grade boundary calculator',
    'command words',
    'raw marks to grade',
    'free A-Level tools',
  ],
})

export default function ToolsHubPage() {
  const featured = INSTRUMENTS.find((t) => t.featured)
  const rack = INSTRUMENTS.filter((t) => !t.featured)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Free Cambridge revision tools"
        description="Free tools for Cambridge students — grade boundary calculator and command words explorer."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: PATH },
        ]}
      />
      <JsonLd data={[softwareApplicationNode()]} />

      <div className="ms-pg ms-tools-desk">
        <MarketingBreadcrumbs
          items={[
            { name: 'Home', path: '/' },
            { name: 'Tools', path: PATH },
          ]}
          className="mb-5"
        />

        <section className="ms-tools-desk__hero" aria-labelledby="tools-desk-title">
          <div className="ms-tools-desk__copy">
            <div className="ms-tools-desk__brand">
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                MS
              </span>
              <span className="ms-tools-desk__brand-mark">MarkScheme · instrument desk</span>
            </div>

            <h1 id="tools-desk-title" className="ms-tools-desk__title">
              Tools that speak <em>examiner.</em>
            </h1>

            <p className="ms-tools-desk__lead">
              No sign-up. Check where a raw mark lands, decode command words, plan the weeks
              left — built from the same schemes we use to mark full papers.
            </p>

            <p className="ms-tools-desk__note" aria-hidden>
              thresholds are ink — grades are earned
            </p>

            <div className="ms-tools-desk__actions">
              <Link
                href="/mark"
                className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
              >
                <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                  M1
                </span>
                Mark a paper free -&gt;
              </Link>
              <Link
                href="/tools/will-my-grade-hold"
                className="ec-btn-ghost inline-flex min-h-[48px]"
              >
                Will my grade hold?
              </Link>
            </div>
          </div>

          <div className="ms-tools-desk__artefact">
            <ToolsDeskArtefact />
          </div>
        </section>

        <section className="ms-tools-desk__rack" aria-labelledby="tools-rack-heading">
          <div className="ms-tools-desk__rack-head">
            <div>
              <p className="ms-overline">On the desk</p>
              <h2 id="tools-rack-heading" className="ms-tools-desk__rack-title">
                Pick an instrument
              </h2>
            </div>
          </div>

          <ul className="ms-tools-instruments">
            {featured ? (
              <li>
                <Link
                  href={featured.href}
                  className="ms-tools-instrument ms-tools-instrument--featured"
                >
                  <span className="ms-tools-instrument__stamp" aria-hidden>
                    {featured.stamp}
                  </span>
                  <span className="ms-tools-instrument__body">
                    <span className="ms-tools-instrument__name">{featured.title}</span>
                    <span className="ms-tools-instrument__job">{featured.job}</span>
                    <span className="ms-tools-instrument__cta">
                      {featured.cta} <span aria-hidden>-&gt;</span>
                    </span>
                  </span>
                  <span className="ms-tools-instrument__go" aria-hidden>
                    -&gt;
                  </span>
                </Link>
              </li>
            ) : null}

            {rack.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="ms-tools-instrument">
                  <div className="ms-tools-instrument__top">
                    <span className="ms-tools-instrument__stamp" aria-hidden>
                      {tool.stamp}
                    </span>
                    <span className="ms-tools-instrument__go" aria-hidden>
                      -&gt;
                    </span>
                  </div>
                  <span className="ms-tools-instrument__body">
                    <span className="ms-tools-instrument__name">{tool.title}</span>
                    <span className="ms-tools-instrument__job">{tool.job}</span>
                    <span className="ms-tools-instrument__cta">
                      {tool.cta} <span aria-hidden>-&gt;</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="ms-tools-desk__payoff" aria-labelledby="tools-payoff-heading">
          <p className="ms-overline">Beyond the estimate</p>
          <h2 id="tools-payoff-heading" className="ms-tools-desk__payoff-title">
            Want feedback on the actual answer, not just a grade?
          </h2>
          <p className="ms-tools-desk__payoff-lead">
            A boundary check tells you where you landed. MarkScheme tells you <em>why</em> —
            upload your paper and get mark-by-mark feedback against the real Cambridge scheme.
          </p>
          <div className="ms-tools-desk__payoff-actions">
            <Link
              href="/mark"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark a paper free -&gt;
            </Link>
            <Link href="/guides" className="ec-btn-ghost inline-flex min-h-[48px]">
              Browse revision guides
            </Link>
          </div>
        </section>

        <PageHelpStrip />
      </div>
    </MarketingPageShell>
  )
}
