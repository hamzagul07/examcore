import Link from 'next/link'
import { Brain, Layers, PenLine } from 'lucide-react'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase-server'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { Hero } from '@/components/marketing/Hero'
import { LandingScreenshotSteps } from '@/components/landing/LandingScreenshotSteps'
import { LandingSectionReveal } from '@/components/landing/LandingSectionReveal'

export const metadata = getPageMetadata('/how-it-works')

export default async function HowItWorksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const markHref = user ? '/mark' : buildMarketingSignUpHref()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/how-it-works"
        title="How MarkScheme marks Cambridge past papers"
        description="Pick a past paper, upload handwritten working, and get mark-by-mark feedback from the real Cambridge mark scheme."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ]}
      />
      <MarketingHero
        label="How it works"
        title={
          <>
            From photo to marked script, <em>in four honest steps.</em>
          </>
        }
        lead="No magic claimed. Here's exactly what happens to your work — and where the limits are."
      />

      <MarketingSection className="!pt-0">
        <LandingScreenshotSteps />
      </MarketingSection>

      <MarketingSection className="!pt-0">
        <Hero primaryHref={markHref} embedded />
      </MarketingSection>

      <MarketingSection>
        <LandingSectionReveal>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureBlock
              icon={Brain}
              title="Adaptive marking"
              body="MCQ keys, B1/M1/A1 step marks, and essay band descriptors — the engine detects the question type and marks it the way Cambridge does, not with a generic rubric."
            />
            <FeatureBlock
              icon={PenLine}
              title="Examiner's Ink"
              body="Red-pen-style notes anchored to your actual handwriting. See which line earned B1, where M1 was lost, or why your essay sits in a particular band — not a vague paragraph at the bottom."
            />
            <FeatureBlock
              icon={Layers}
              title="Mastery tracking"
              body="Each attempt feeds your syllabus coverage map. Spot blindspots, track progress across spec points, and know what to revise next — built from your real marking history."
            />
          </div>
        </LandingSectionReveal>
      </MarketingSection>

      <MarketingSection>
        <p className="ms-overline">Honest about the AI</p>
        <h2 className="ms-h2" style={{ marginTop: 0 }}>
          What it does well — and where it&apos;s <em>limited</em>
        </h2>
        <div className="ms-canct">
          <div className="ms-dash-card">
            <h3 className="ms-h3" style={{ color: 'var(--ec-brand)' }}>
              What it does well
            </h3>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-brand)' }}>✓</span>
              Applies the official scheme criteria, mark by mark, with citations
            </div>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-brand)' }}>✓</span>
              Reads most handwriting, including multi-page working
            </div>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-brand)' }}>✓</span>
              Spots recurring error patterns across your attempts
            </div>
          </div>
          <div className="ms-dash-card">
            <h3 className="ms-h3" style={{ color: 'var(--ec-ink-crimson)' }}>
              Where it&apos;s limited
            </h3>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>✗</span>
              Genuinely illegible lines are flagged, not guessed
            </div>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>✗</span>
              Essay band judgements are approximate — a human examiner may differ
            </div>
            <div className="ms-canct-item">
              <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>✗</span>
              Grade estimates are boundary-pattern approximations, not predictions
            </div>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link href={markHref} className="ec-btn-primary inline-flex min-h-[48px]">
            Try it on one question
          </Link>
          <p className="ms-micro" style={{ marginTop: 18 }}>
            FREE TIER · ABOUT A MINUTE · NOT ENDORSED BY CAMBRIDGE INTERNATIONAL
          </p>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}

function FeatureBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Brain
  title: string
  body: string
}) {
  return (
    <div className="ms-dash-card p-6 sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ec-tint-brand-icon">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="ms-h3 mb-3">{title}</h3>
      <p className="ms-body-2">{body}</p>
    </div>
  )
}
