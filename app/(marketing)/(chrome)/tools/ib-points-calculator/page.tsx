import Link from 'next/link'

import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { IbPointsCalculator } from '@/components/tools/IbPointsCalculator'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

const PATH = '/tools/ib-points-calculator'

const FAQS = [
  {
    q: 'How is the IB Diploma scored out of 45?',
    a: 'Each of your six subjects is graded 1–7, giving a maximum of 42 points. Theory of Knowledge and the Extended Essay together add up to 3 bonus points from a fixed matrix, for a maximum of 45. CAS is required but not graded.',
  },
  {
    q: 'How many points do you need to pass the IB?',
    a: 'You need at least 24 points to be awarded the diploma, plus several conditions: no grade 1, no more than two 2s, no more than three grades of 3 or below, at least 12 points at HL and 9 at SL (for 3 HL + 3 SL), no E in TOK or the Extended Essay, and completed CAS.',
  },
  {
    q: 'How do TOK and the Extended Essay give bonus points?',
    a: 'Your TOK grade and Extended Essay grade (each A–E) are read off a fixed matrix that awards 0–3 bonus points. Two A grades give the full 3 points; an E in either is a failing condition that awards no bonus and prevents the diploma being issued.',
  },
  {
    q: 'What counts as a good IB score?',
    a: 'The global average is around 30–31 points. A score of 38+ is strong and competitive for selective universities, while 40+ places you near the top. Many courses set offers in points (e.g. 36 with specific HL grades), so always check your target universities.',
  },
]

export const metadata = getPageMetadata(PATH, {
  ogImagePath: '/api/og/tools/ib-points-calculator',
  title: 'IB points calculator (out of 45) — TOK & EE bonus',
  description:
    'Free IB Diploma points calculator: enter your six subject grades (1–7) plus TOK and Extended Essay to get your total out of 45 and check the pass conditions.',
  keywords: [
    'IB points calculator',
    'IB score calculator',
    'IB diploma points',
    'IB total out of 45',
    'TOK EE points matrix',
    'IB passing score',
  ],
})

function IbArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: 38 points out of 45, diploma conditions met"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Diploma · /45</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          45
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">38</span>
        <span className="ms-tools-artefact__of">/ 45</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Subjects</dt>
          <dd>36</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>TOK/EE</dt>
          <dd>+2</dd>
        </div>
        <div className="ms-tools-artefact__row">
          <dt>Pass</dt>
          <dd>Met</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        24 is the floor — conditions decide the award
      </p>
    </aside>
  )
}

export default function IbPointsCalculatorPage() {
  return (
    <>
      <PageJsonLd
        path={PATH}
        title="IB Diploma points calculator"
        description="Add up your IB Diploma score out of 45 from six subject grades plus TOK and Extended Essay bonus points, and check the award conditions."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'IB points calculator', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <ToolInstrumentShell
        stamp="45"
        label="IB Diploma instrument"
        title={
          <>
            IB points <em>calculator</em>
          </>
        }
        lead="Add up your IB score out of 45 — six subjects (1–7) plus the Theory of Knowledge and Extended Essay bonus — and instantly see whether you meet the diploma award conditions."
        note="points tell you where you are — bands tell you how to climb"
        artefact={<IbArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'IB points calculator', path: PATH },
        ]}
        after={
          <>
            <section className="ms-tool-instrument__faq" aria-labelledby="ib-faq">
              <h2 id="ib-faq" className="ms-tool-instrument__faq-title">
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
            <PageHelpStrip />
          </>
        }
      >
        <IbPointsCalculator />

        <div className="mt-12 max-w-2xl">
          <h2 className="ms-h3">How the IB /45 is built</h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            Six subjects are each graded 1–7, so subjects alone are worth up to 42 points. Your
            Theory of Knowledge and Extended Essay grades (A–E) are then read off the official bonus
            matrix, which adds 0–3 points — giving the familiar maximum of 45. An E in either TOK or
            the Extended Essay is a failing condition: it awards no bonus and prevents the diploma
            being issued, however high your subject total.
          </p>
          <h2 className="ms-h3" style={{ marginTop: 24 }}>
            Passing is more than 24 points
          </h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            24 points is the minimum, but the award also checks the spread of your grades — no grade
            1, limits on low grades, and minimum totals at HL and SL. This calculator flags each
            condition so you can see exactly what is keeping you below the line. It does not check
            CAS, which is required but not graded.
          </p>
        </div>

        <aside className="ms-mark-example-slip mt-12">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              7
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Turn a 5 into a 7</p>
              <p className="ms-mark-example-slip__lead">
                A points total tells you where you are. Free MarkScheme IB courses and markband-aware
                practice show you how to climb a band in each subject.
              </p>
              <span className="ms-mark-example-slip__note" aria-hidden>
                climb the band — don&apos;t just count the points
              </span>
            </div>
          </div>
          <Link
            href="/ib/courses"
            className="ec-btn-primary ms-mark-example-slip__cta inline-flex min-h-[44px] items-center gap-2"
          >
            Explore free IB courses
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              -&gt;
            </span>
          </Link>
        </aside>
      </ToolInstrumentShell>
    </>
  )
}
