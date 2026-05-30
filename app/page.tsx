import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { LandingHeroEntry, LandingMockupHero } from './page.client'
import { LandingChat } from '@/components/omni-ai/LandingChat'
import { LandingSubjects } from '@/components/landing/LandingSubjects'
import { LandingScreenshotSteps } from '@/components/landing/LandingScreenshotSteps'
import { LandingFounder } from '@/components/landing/LandingFounder'
import { LandingComparison } from '@/components/landing/LandingComparison'
import { LandingFaq } from '@/components/landing/LandingFaq'
import { LandingSectionReveal } from '@/components/landing/LandingSectionReveal'
import {
  Brain,
  ArrowRight,
  Camera,
  TrendingUp,
  PenLine,
  FileStack,
  Layers,
  ListChecks,
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const markHref = user ? '/mark' : '/auth/signup'

  return (
    <div className="relative min-h-screen">
      <main>
        {/* Hero */}
        <section className="landing-section relative scroll-mt-20 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <div className="landing-hero-glow" aria-hidden />
          <LandingHeroEntry>
            <div className="relative mx-auto max-w-7xl text-center">
              <div className="mb-8 flex justify-center">
                <span className="ec-label-tech">
                  Early access · Free · 15 subjects
                </span>
              </div>

              <h1 className="text-display mb-6 text-[var(--ec-text-primary)]">
                <span className="gradient-text">Your past papers,</span>
                <br />
                <span className="ec-text-gradient brand-breathe">
                  marked like the exam
                </span>
              </h1>

              <p className="landing-lead mx-auto mb-12 max-w-2xl">
                Snap your working, pick the paper, get examiner-style feedback —
                MCQ keys, B1/M1/A1, or essay bands from the real Cambridge
                scheme.
              </p>

              <div className="mb-10">
                <LandingChat />
              </div>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={markHref}
                  className="ec-btn-primary w-full min-h-[52px] text-base sm:w-auto"
                  style={{ padding: '16px 32px' }}
                >
                  Mark your first question <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="ec-btn-secondary w-full min-h-[52px] text-base sm:w-auto"
                  style={{ padding: '16px 32px' }}
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-4xl sm:mt-20">
              <div className="pointer-events-none absolute -inset-x-16 inset-y-0 -z-10">
                <div className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
                <div className="absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/20 blur-[120px]" />
              </div>
              <LandingMockupHero />
            </div>
          </LandingHeroEntry>
        </section>

        {/* What you get */}
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
            <div className="ec-card ec-card-interactive col-span-6 row-span-2 relative overflow-hidden p-8 md:col-span-4 md:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-[100px]" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                  <Brain className="h-7 w-7 text-emerald-400" strokeWidth={1.75} />
                </div>
                <h3 className="landing-h3 mb-3">Official mark schemes</h3>
                <p className="landing-lead max-w-md">
                  Each question pulls criteria from the real Cambridge paper —
                  B1/M1/A1, MCQ keys, and essay bands.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-400">
                    B1 · M1 · A1
                  </span>
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-400">
                    MCQ
                  </span>
                  <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-mono text-xs text-violet-400">
                    Essay bands
                  </span>
                </div>
              </div>
            </div>

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <ListChecks className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Right marking style</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                MCQ, maths-style steps, or essays — detected per question.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
                <PenLine className="h-6 w-6 text-violet-400" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Examiner&apos;s Ink</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Notes on your lines — see which step earned or lost a mark.
              </p>
            </div>

            <div className="ec-card col-span-6 flex flex-col justify-center p-8 md:col-span-2 relative overflow-hidden">
              <span className="text-7xl font-extrabold ec-text-gradient">15</span>
              <span className="mt-3 text-base text-[var(--ec-text-secondary)]">
                Cambridge subjects ready to mark
              </span>
            </div>

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-4">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <FileStack className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
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

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-3">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <Layers className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Spec-point mastery</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Track leaves on the syllabus — what&apos;s solid, what needs
                work, what you haven&apos;t tried.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-3">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
                <Camera className="h-6 w-6 text-violet-400" strokeWidth={1.75} />
              </div>
              <h3 className="landing-h3 mb-2">Photos, camera, PDF</h3>
              <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
                Multi-page uploads with reorder — assign pages to questions on
                whole papers.
              </p>
            </div>

            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
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

        {/* How it works — real screenshots */}
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
        </section>

        {/* Subjects */}
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
        </section>

        {/* Founder */}
        <section id="story" className="landing-section scroll-mt-20">
          <LandingFounder />
        </section>

        {/* Comparison */}
        <section className="landing-section">
          <LandingComparison />
        </section>

        {/* FAQ */}
        <section id="faq" className="landing-section scroll-mt-20">
          <LandingFaq />
        </section>

        {/* Final CTA */}
        <section className="landing-section pb-28">
          <LandingSectionReveal>
            <div className="ec-card relative overflow-hidden p-10 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-[100px]" />
                <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/15 blur-[100px]" />
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
                  className="ec-btn-primary inline-flex min-h-[52px] text-lg"
                  style={{ padding: '18px 36px' }}
                >
                  Mark your first question
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="mt-6 text-sm text-[var(--ec-text-secondary)]">
                  Free during early access · Not endorsed by Cambridge
                  International
                </p>
              </div>
            </div>
          </LandingSectionReveal>
        </section>
      </main>

      <footer className="border-t border-[var(--ec-border)] px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-sm text-[var(--ec-text-secondary)] sm:flex-row">
          <div className="text-center sm:text-left">
            <span className="font-bold ec-text-gradient text-base">Examcore</span>
            <p className="mt-2 max-w-xs text-xs leading-relaxed">
              Built for students preparing for Cambridge A-Levels.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/auth/signin"
              className="min-h-[44px] py-2 transition-colors hover:text-[var(--ec-text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href={markHref}
              className="min-h-[44px] py-2 transition-colors hover:text-[var(--ec-text-primary)]"
            >
              Mark an answer
            </Link>
            <a
              href="mailto:hello@examcore.ai"
              className="min-h-[44px] py-2 transition-colors hover:text-[var(--ec-text-primary)]"
            >
              hello@examcore.ai
            </a>
          </div>
          <span className="text-center text-xs sm:text-right">
            © 2026 Examcore · Early access
          </span>
        </div>
      </footer>
    </div>
  )
}
