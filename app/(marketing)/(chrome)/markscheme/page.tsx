import Link from 'next/link'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'

export const metadata = getPageMetadata('/markscheme', {
  title: 'Mark schemes explained — how Cambridge awards marks',
  description:
    'Assessment pages for Cambridge past-paper questions: marking logic, where students lose marks, valid alternatives, and remediation. Distinct from question stem pages.',
})

export default function MarkschemeHubPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/markscheme"
        title="Mark schemes explained"
        description="How Cambridge awards marks — assessment guidance linked to free marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Mark schemes', path: '/markscheme' },
        ]}
      />
      <MarketingHero
        label="Assessment / feedback objects"
        title="How marks are awarded"
        lead="Each mark-scheme page explains marking logic and remediation for a specific paper item. Question stems live on /questions — keep those intents separate."
      />
      <MarketingSection>
        <p className="ms-body-2">
          Open a question object first, then read how marks are awarded, then mark your own attempt.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/questions" className="ec-btn-primary min-h-[48px]">
            Browse question objects
          </Link>
          <Link href="/mark" className="ec-btn-ghost min-h-[48px]">
            Mark an attempt
          </Link>
          <Link href="/caie" className="ec-btn-ghost min-h-[48px]">
            CAIE syllabus graph
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
