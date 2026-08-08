import Link from 'next/link'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'

export const metadata = getPageMetadata('/questions', {
  title: 'Past-paper questions — Cambridge examinable units',
  description:
    'Browse Cambridge past-paper question objects linked to lessons, mark-scheme guidance and free marking. Short previews only — full attempts happen on /mark.',
})

export default function QuestionsHubPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/questions"
        title="Past-paper questions"
        description="Cambridge examinable-unit pages linked to marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Questions', path: '/questions' },
        ]}
      />
      <MarketingHero
        label="Examinable units"
        title="Past-paper questions"
        lead="Question pages are examinable objects: metadata, what the examiner is asking, prerequisites, and try-it-yourself. Marking logic lives on /markscheme — keep those intents separate."
      />
      <MarketingSection>
        <p className="ms-body-2">
          Start from a subject topic practice hub, or open MarkScheme and pick a paper.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/past-papers/topics" className="ec-btn-primary min-h-[48px]">
            Questions by topic
          </Link>
          <Link href="/markscheme" className="ec-btn-ghost min-h-[48px]">
            How marks are awarded
          </Link>
          <Link href="/mark" className="ec-btn-ghost min-h-[48px]">
            Mark a question
          </Link>
          <Link href="/caie" className="ec-btn-ghost min-h-[48px]">
            CAIE syllabus graph
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
