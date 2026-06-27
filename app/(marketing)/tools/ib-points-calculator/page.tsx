import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { IbPointsCalculator } from '@/components/tools/IbPointsCalculator'

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

export default function IbPointsCalculatorPage() {
  return (
    <MarketingPageShell>
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

      <MarketingHero
        label="Free tool"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'IB points calculator', path: PATH },
        ]}
        title="IB Diploma points calculator"
        lead="Add up your IB score out of 45 — six subjects (1–7) plus the Theory of Knowledge and Extended Essay bonus — and instantly see whether you meet the diploma award conditions."
      />

      <MarketingSection className="!pt-0">
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

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Turn a 5 into a 7</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            A points total tells you where you are. Free MarkScheme IB courses and markband-aware
            practice show you how to climb a band in each subject.
          </p>
          <Link href="/ib/courses" className="ec-btn-primary inline-flex min-h-[48px]">
            Explore free IB courses <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="ms-micro mt-6">
            More tools:{' '}
            <Link href="/tools" className="ec-btn-underline">
              all free revision tools
            </Link>
            .
          </p>
        </div>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
