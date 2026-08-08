import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'

export const metadata = getPageMetadata('/results-2026/edexcel', {
  title: 'Edexcel International results 2026 — UMS, remarks, next units',
  description:
    'Edexcel International A Level results hub: interpret UMS, plan remarks or retakes, browse IAL Maths units, and mark practice answers with method/accuracy conventions.',
  keywords: [
    'Edexcel International results 2026',
    'Edexcel IAL UMS',
    'Edexcel IAL remark',
    'Edexcel International A Level results',
  ],
})

export default function Results2026EdexcelPage() {
  const path = '/results-2026/edexcel'

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title="Edexcel International results 2026"
        description="Interpret IAL UMS, plan remarks or retakes, and practise with examiner-style marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'Edexcel International', path },
        ]}
      />

      <MarketingHero
        label="Edexcel International · 2026"
        title="IAL results — UMS, remarks, next units"
        lead="Modular International A Levels cash in via UMS. Use your unit results to decide on enquiries, retakes, and which Pure/Mechanics/Statistics papers to rebuild. MarkScheme marks IAL Maths practice with method and accuracy conventions."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/edexcel/international-a-level/mathematics"
            className="ec-btn-primary min-h-[48px]"
          >
            IAL Mathematics hub <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/mark?board=edexcel" className="ec-btn-ghost min-h-[48px]">
            Mark Edexcel Maths
          </Link>
          <Link href="/tools/pum-calculator" className="ec-btn-ghost min-h-[48px]">
            PUM / UMS calculator
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="ms-h2">After results</h2>
            <ul className="ms-body-2 list-disc space-y-2 pl-5">
              <li>Map each unit grade to your cash-in combination and overall UMS target.</li>
              <li>Talk to your exams officer about enquiries upon results before centre deadlines.</li>
              <li>
                Retake the unit where a mark move is realistic — not every modular paper.
              </li>
              <li>
                Rebuild weak topics on the{' '}
                <Link
                  href="/edexcel/international-a-level/mathematics"
                  className="underline"
                >
                  IAL Maths unit map
                </Link>{' '}
                then mark a typed or photographed answer.
              </li>
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026-edexcel" />
        </div>
      </MarketingSection>

      <MarketingSection>
        <p className="flex flex-wrap gap-4">
          <Link href="/results-2026" className="ec-btn-underline">
            Cambridge Results Day hub
          </Link>
          <Link href="/results-2026/ib" className="ec-btn-underline">
            IB Diploma results
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
