import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { LandingHero } from '@/components/landing/LandingHero'
import { Hero } from '@/components/marketing/Hero'
import { LandingSubjects } from '@/components/landing/LandingSubjects'
import { LandingScreenshotSteps } from '@/components/landing/LandingScreenshotSteps'
import { LandingFounder } from '@/components/landing/LandingFounder'
import { LandingComparison } from '@/components/landing/LandingComparison'
import { LandingFaq } from '@/components/landing/LandingFaq'
import { LandingSectionReveal } from '@/components/landing/LandingSectionReveal'
import {
  Brain,
  Camera,
  TrendingUp,
  PenLine,
  FileStack,
  Layers,
  ListChecks,
  ArrowRight,
} from 'lucide-react'

export const metadata = createPageMetadata({
  title: 'AI marking for Cambridge A-Levels & O-Levels',
  description:
    'Upload handwritten Cambridge answers and get mark-by-mark feedback in seconds. A-Level and O-Level subjects — free during early access. Founding members lock in 50% off forever.',
  path: '/',
})

export default async function Home() {
  const markHref = '/mark'

  return (
    <div className="relative min-h-screen">
      <main>
        <section className="landing-section relative scroll-mt-20 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <div className="landing-hero-glow" aria-hidden />
          <LandingHero markHref={markHref} />
        </section>

        <section id="features" className="landing-section scroll-mt-20">
          <LandingSectionReveal>
            <div className="mb-12 max-w-3xl">
              <p className="ec-label-tech mb-4">WHAT YOU GET</p>
              <h2 className="landing-h2">
                <span className="gradient-text">Real schemes.</span>{' '}
                <span className="ec-text-gradient">Real standards.</span>
              </h2>
              <p className="landing-lead mt-4">
                Not a generic chatbot grade — feedback tied to the actual mark
                scheme for that paper and question.
              </p>
            </div>
          </LandingSectionReveal>

          <div className="bento-grid">
            <div className="ec-card ec-card-interactive col-span-2 relative overflow-hidden p-6 sm:col-span-2 sm:p-8 lg:col-span-4 lg:row-span-2 lg:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full ec-glow-orb blur-[100px]" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ec-tint-success-icon">
                  <Brain className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <h3 className="landing-h3 mb-3">Official mark schemes</h3>
                <p className="landing-lead max-w-md">
                  Each question pulls criteria from the real Cambridge paper —
                  B1/M1/A1, MCQ keys, and essay bands.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="ec-tint-success-chip rounded-md px-2.5 py-1 font-mono text-xs">
                    B1 · M1 · A1
                  </span>
                  <span className="ec-tint-info-chip rounded-md px-2.5 py-1 font-mono text-xs">
                    MCQ
                  </span>
                  <span className="ec-tint-accent-chip rounded-md px-2.5 py-1 font-mono text-xs">
                    Essay bands
                  </span>
                </div>
              </div>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-2">
              <div className="ec-tint-info-icon-wrap mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
                <ListChecks className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Right marking style</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                MCQ, maths-style steps, or essays — detected per question.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-2">
              <div className="ec-tint-accent-icon-wrap mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
                <PenLine className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Examiner&apos;s Ink</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Notes on your lines — see which step earned or lost a mark.
              </p>
            </div>

            <div className="ec-card col-span-2 flex flex-col justify-center p-8 md:col-span-2 relative overflow-hidden">
              <span className="text-7xl font-extrabold ec-text-gradient">15</span>
              <span className="mt-3 text-base text-[var(--ec-text-secondary)]">
                Cambridge subjects ready to mark
              </span>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-4">
              <div className="flex items-start gap-5">
                <div className="ec-tint-success-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
                  <FileStack className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="landing-h3 mb-2">One question or whole paper</h3>
                  <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                    Quick check on a single part, or upload the full script with
                    a projected grade if you only did some questions.
                  </p>
                </div>
              </div>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-3">
              <div className="ec-tint-info-icon-wrap mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
                <Layers className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Spec-point mastery</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Track leaves on the syllabus — what&apos;s solid, what needs
                work, what you haven&apos;t tried.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-3">
              <div className="ec-tint-accent-icon-wrap mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
                <Camera className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Photos, camera, PDF</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Multi-page uploads with reorder — assign pages to questions on
                whole papers.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-2 p-8 md:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="ec-tint-success-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
                  <TrendingUp className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="landing-h3 mb-2">Grade boundaries</h3>
                  <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                    Rough A*–E estimates from real boundary patterns — honest
                    approximations, not a crystal ball.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section scroll-mt-20">
          <LandingSectionReveal>
            <div className="mb-16 max-w-2xl">
              <p className="ec-label-tech ec-label-tech-cyan mb-4">HOW IT WORKS</p>
              <h2 className="landing-h2">
                <span className="gradient-text">Upload. Mark. Fix.</span>
              </h2>
              <p className="landing-lead mt-4">
                Same flow whether it&apos;s one integration or a full mechanics
                paper — here&apos;s what you actually see.
              </p>
            </div>
          </LandingSectionReveal>
          <LandingScreenshotSteps />
          <div className="mt-20 border-t border-[var(--ec-border)] pt-16 md:pt-20">
            <Hero primaryHref={markHref} embedded />
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/how-it-works"
              className="text-sm ec-link"
            >
              Full walkthrough →
            </Link>
          </div>
        </section>

        <section id="subjects" className="landing-section scroll-mt-20">
          <LandingSectionReveal>
            <div className="mb-12 max-w-2xl">
              <p className="ec-label-tech ec-label-tech-violet mb-4">SUBJECTS</p>
              <h2 className="landing-h2">
                <span className="gradient-text">Fifteen papers. One place.</span>
              </h2>
              <p className="landing-lead mt-4">
                Sciences, essays, business, computing — pick your code and mark
                against the right scheme.
              </p>
            </div>
          </LandingSectionReveal>
          <LandingSubjects />
          <div className="mt-12 text-center">
            <Link
              href="/subjects"
              className="text-sm ec-link"
            >
              All subjects & paper codes →
            </Link>
          </div>
        </section>

        <section id="story" className="landing-section scroll-mt-20">
          <LandingFounder />
        </section>

        <section className="landing-section">
          <LandingComparison />
        </section>

        <section id="faq" className="landing-section scroll-mt-20">
          <LandingFaq />
        </section>

        <section className="landing-section pb-28">
          <LandingSectionReveal>
            <div className="ec-card relative overflow-hidden p-10 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full ec-glow-orb blur-[100px]" />
                <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full ec-glow-orb-accent blur-[100px]" />
              </div>
              <div className="relative">
                <h2 className="landing-h2 mb-4">
                  <span className="gradient-text">Try one question.</span>
                  <br />
                  <span className="ec-text-gradient">About a minute.</span>
                </h2>
                <p className="landing-lead mx-auto mb-8 max-w-lg">
                  No card, no commitment. Mark something you already wrote and
                  see what examiner-style feedback looks like.
                </p>
                <Link
                  href={markHref}
                  className="ec-btn-primary inline-flex min-h-[52px] px-9 py-[18px] text-lg"
                >
                  Mark your first question
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="mt-6 text-sm text-[var(--ec-text-secondary)]">
                  Free during early access · Founding members get 50% off forever ·
                  Not endorsed by Cambridge International
                </p>
              </div>
            </div>
          </LandingSectionReveal>
        </section>
      </main>
    </div>
  )
}
