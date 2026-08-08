import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'

export const metadata = getPageMetadata('/results-2026/ib', {
  title: 'IB Diploma results 2026 — points, remarks, next steps',
  description:
    'IB Diploma results season hub: interpret your points, plan EARs/retakes, use the IB points calculator, and capture a mock-season pack for November.',
  keywords: [
    'IB results 2026',
    'IB Diploma points',
    'IB remark',
    'IB points calculator',
  ],
})

export default function Results2026IbPage() {
  const path = '/results-2026/ib'

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title="IB Diploma results 2026"
        description="Interpret IB points, plan remarks or retakes, and practise criterion marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'IB Diploma', path },
        ]}
      />

      <MarketingHero
        label="IB Diploma · 2026"
        title="IB results — points, remarks, next papers"
        lead="Use your points total and subject grades to decide on enquiries upon results, retakes, and which HL/SL topics to rebuild before the next session. MarkScheme gives criterion-style feedback on practice answers."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tools/ib-points-calculator" className="ec-btn-primary min-h-[48px]">
            IB points calculator <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/ib/courses" className="ec-btn-ghost min-h-[48px]">
            Free IB courses
          </Link>
          <Link href="/mark?board=ib" className="ec-btn-ghost min-h-[48px]">
            Mark with IB criteria
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="ms-h2">After results</h2>
            <ul className="ms-body-2 list-disc space-y-2 pl-5">
              <li>Confirm university / school conditions against your total points and core requirements.</li>
              <li>Discuss category 1 / 2 / 3 enquiries with your IB coordinator before deadlines.</li>
              <li>Retake planning: pick the components where a band move is realistic, not every paper.</li>
              <li>
                Rebuild weak topics in{' '}
                <Link href="/ib/topic-practice" className="underline">
                  IB topic practice
                </Link>{' '}
                then mark a typed answer.
              </li>
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026-ib" />
        </div>
      </MarketingSection>

      <MarketingSection>
        <p>
          <Link href="/results-2026" className="ec-btn-underline">
            ← Cambridge Results Day hub
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
