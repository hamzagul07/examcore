import Link from 'next/link'
import { Brain, Layers, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { Hero } from '@/components/marketing/Hero'
import { LandingScreenshotSteps } from '@/components/landing/LandingScreenshotSteps'
import { LandingSectionReveal } from '@/components/landing/LandingSectionReveal'

export const metadata = createPageMetadata({
  title: 'How it works',
  description:
    'Upload your handwritten answer, get mark-by-mark feedback from real Cambridge schemes, and track syllabus mastery.',
  path: '/how-it-works',
})

export default async function HowItWorksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const markHref = user ? '/mark' : '/auth/signup'

  return (
    <MarketingPageShell>
      <MarketingHero
        label="HOW IT WORKS"
        title={
          <>
            <span className="gradient-text">Upload.</span>{' '}
            <span className="ec-text-gradient">Mark. Fix.</span>
          </>
        }
        lead="The same flow for one integration question or a full paper — here's what you actually see, step by step."
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
        <div className="ec-card p-8 sm:p-10">
          <p className="ec-label-tech mb-4">HONEST ABOUT AI</p>
          <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
            A study companion that works like an examiner
          </h2>
          <div className="landing-lead max-w-3xl space-y-4">
            <p>
              Examcore uses AI trained on real Cambridge mark schemes — not a
              replacement for examiners, and not a magic grade guarantee. Final
              grades are decided by Cambridge International, not us.
            </p>
            <p>
              What you get is fast, detailed feedback when you&apos;re revising
              alone: the same criteria an examiner would apply, explained clearly
              enough that you can disagree and still learn.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="ec-btn-primary mt-8 inline-flex min-h-[48px]"
          >
            Try it free
          </Link>
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
    <div className="ec-card p-6 sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <Icon className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
      </div>
      <h3 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">{title}</h3>
      <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">{body}</p>
    </div>
  )
}
