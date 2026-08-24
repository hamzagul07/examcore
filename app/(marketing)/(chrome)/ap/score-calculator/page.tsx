import Link from 'next/link'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { apMarkHref } from '@/lib/ap/marking'
import { apRootPath, apScoreCalculatorPath } from '@/lib/seo/ap-graph'

export const metadata = createPageMetadata({
  title: 'AP score calculator — coming soon',
  description:
    'A real AP 1–5 projection helper is not live yet. Practise FRQs with earned/not-earned marking on MarkScheme meanwhile.',
  path: apScoreCalculatorPath(),
  keywords: ['AP score calculator', 'AP 1 to 5', 'AP exam score'],
})

/**
 * Honest placeholder — do not claim an interactive College Board calculator.
 * Dedicated route (not jammed into [course]).
 */
export default function ApScoreCalculatorPage() {
  const path = apScoreCalculatorPath()
  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title="AP score calculator"
        description="Coming soon — FRQ marking is available now."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AP', path: apRootPath() },
          { name: 'Score calculator', path },
        ]}
      />
      <MarketingHero
        label="AP"
        title="Score calculator"
        lead="An interactive 1–5 projection tool is not live yet. Official scores come from College Board. Today you can mark FRQs with earned/not-earned guidelines."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={apMarkHref('ap-calculus-ab')}
            className="ec-btn-primary inline-flex min-h-[48px] items-center"
          >
            Mark a Calculus AB FRQ -&gt;
          </Link>
          <Link href={apRootPath()} className="ec-btn-ghost inline-flex min-h-[48px] items-center">
            AP hub
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection>
        <p className="ms-body-2">
          We will not show a fake calculator. When the helper ships, it will be clearly
          labelled as indicative practice only.
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
