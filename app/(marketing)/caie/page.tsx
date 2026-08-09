import Link from 'next/link'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { getAllCaieHubParams, getCaieSubjectRef } from '@/lib/seo/caie-graph'

export const metadata = getPageMetadata('/caie', {
  title: 'Cambridge (CAIE) syllabus graph — courses, flashcards, practice',
  description:
    'Browse Cambridge International A-Level, AS, O-Level and IGCSE syllabuses as a searchable graph: lessons, flashcards, FAQs, quizzes and past-paper practice linked to marking.',
  keywords: [
    'Cambridge syllabus',
    'CAIE A Level',
    'free Cambridge courses',
    '9709',
    '9702',
  ],
})

export default function CaieHubPage() {
  const hubs = getAllCaieHubParams()
    .map((p) => getCaieSubjectRef(p.code))
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/caie"
        title="Cambridge syllabus graph"
        description="Cambridge International learning graph linked to past-paper marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'CAIE', path: '/caie' },
        ]}
      />
      <MarketingHero
        label="Cambridge International"
        title="CAIE syllabus graph"
        lead="Every syllabus code is a hub: lessons, flashcards, FAQs, quizzes and practice questions — all wired to scheme-aligned marking on /mark."
      />
      <MarketingSection>
        <ul className="ms-board-index">
          {hubs.map((h) => (
            <li key={h.code}>
              <Link href={h.hubPath} className="ms-board-slip">
                <span className="ms-board-slip__code">{h.code}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{h.name}</span>
                  <span className="ms-board-slip__meta">{h.levelSlug}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <div className="ms-board-cross">
          <p className="ms-overline">Also marking</p>
          <h2 className="ms-h2">On Edexcel International instead?</h2>
          <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
            Many international schools offer Pearson Edexcel IAL alongside Cambridge.
            IAL Maths, Physics and Chemistry marking is live with method/accuracy conventions — same product,
            different dialect.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/mark?board=edexcel&subject=WMA11"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark Edexcel IAL -&gt;
            </Link>
            <Link href="/edexcel" className="ec-btn-ghost inline-flex min-h-[48px]">
              Browse Edexcel hubs
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
