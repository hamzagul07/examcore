import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import {
  LandingHeroEntry,
  LandingMockup,
  LandingMockupHero,
} from './page.client'
import { LandingChat } from '@/components/omni-ai/LandingChat'
import {
  Brain,
  Zap,
  Target,
  Sparkles,
  ArrowRight,
  Camera,
  TrendingUp,
  Calculator,
  Atom,
  FlaskConical,
  Microscope,
  type LucideIcon,
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative min-h-screen">
      <main>
        {/* ====== Hero ====== */}
        <section className="relative px-6 pb-24 pt-24 sm:pt-32">
          <LandingHeroEntry>
            <div className="mx-auto max-w-7xl text-center">
              <div className="mb-8 flex justify-center">
                <span className="ec-label-tech">AI-Powered Marking · Free Beta</span>
              </div>

              <h1 className="text-display mb-6">
                <span className="gradient-text">Get marked</span>
                <br />
                <span className="ec-text-gradient brand-breathe">in 30 seconds</span>
              </h1>

              <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl md:text-2xl">
                Cambridge A-Level Mathematics, marked by AI with{' '}
                <span className="text-white">examiner-grade precision</span>.
              </p>

              {/* Omni-AI — streaming conversational assistant (replaces Command Bar) */}
              <div className="mb-10">
                <LandingChat />
              </div>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={user ? '/mark' : '/auth/signup'}
                  className="ec-btn-primary text-base"
                  style={{ padding: '16px 32px' }}
                >
                  Start marking free <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="ec-btn-secondary text-base"
                  style={{ padding: '16px 32px' }}
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Product preview — floating with multi-color glow */}
            <div className="relative mx-auto mt-20 max-w-4xl sm:mt-24">
              {/* Massive glow behind mockup */}
              <div className="pointer-events-none absolute -inset-x-16 inset-y-0 -z-10">
                <div className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-[120px]" />
                <div className="absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/30 blur-[120px]" />
                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-[140px]" />
              </div>

              <LandingMockupHero />
            </div>
          </LandingHeroEntry>
        </section>

        {/* ====== Features bento grid ====== */}
        <section
          id="how-it-works"
          className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 sm:py-32"
        >
          <div className="mb-12">
            <p className="ec-label-tech mb-4">FEATURES</p>
            <h2 className="max-w-3xl text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[64px] md:text-[72px]">
              <span className="gradient-text">Everything you need</span>
              <br />
              <span className="ec-text-gradient">to ace your exams.</span>
            </h2>
          </div>

          <div className="bento-grid">
            {/* Large feature — Brain */}
            <div className="ec-card ec-card-interactive col-span-6 row-span-2 relative overflow-hidden p-8 md:col-span-4 md:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-[80px]" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                  <Brain className="h-7 w-7 text-emerald-400" strokeWidth={1.75} />
                </div>
                <h3 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Real Cambridge mark schemes
                </h3>
                <p className="max-w-md text-base leading-relaxed text-slate-400 md:text-lg">
                  Your work is marked against the actual Cambridge 9709 mark
                  scheme. Every B1, M1, A1 awarded exactly as a real examiner
                  would.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="font-mono text-xs rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">B1</span>
                  <span className="font-mono text-xs rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">M1</span>
                  <span className="font-mono text-xs rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">A1</span>
                  <span className="font-mono text-xs rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">A1ft</span>
                </div>
              </div>
            </div>

            {/* Medium — speed */}
            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Zap className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">
                30-second feedback
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Upload, mark, learn — instantly.
              </p>
            </div>

            {/* Medium — topics */}
            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Target className="h-6 w-6 text-violet-400" strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">
                Track every topic
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Mastery across the full syllabus.
              </p>
            </div>

            {/* Stat card */}
            <div className="ec-card col-span-6 flex flex-col justify-center p-8 md:col-span-2 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-violet-500/15 blur-[60px]" />
              <span className="relative z-10 text-7xl font-extrabold ec-text-gradient">38</span>
              <span className="relative z-10 mt-3 text-sm text-slate-400">
                Cambridge 9709 topics covered, end to end
              </span>
            </div>

            {/* Wide — solutions */}
            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-4">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <Sparkles className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-2xl font-bold text-white">
                    Worked solutions on demand
                  </h3>
                  <p className="leading-relaxed text-slate-400">
                    Stuck on a question? See the full step-by-step solution
                    after marking — learn the way a great tutor would teach it.
                  </p>
                </div>
              </div>
            </div>

            {/* Wide — trajectory */}
            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-3">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <TrendingUp className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                Predicted grade trajectory
              </h3>
              <p className="leading-relaxed text-slate-400">
                Watch your score line track against A* boundaries in real time.
              </p>
            </div>

            {/* Wide — camera */}
            <div className="ec-card ec-card-interactive col-span-6 p-8 md:col-span-3">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Camera className="h-6 w-6 text-violet-400" strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                Snap a photo. That's it.
              </h3>
              <p className="leading-relaxed text-slate-400">
                Handwritten on paper or typed on screen — both work. No setup.
              </p>
            </div>
          </div>
        </section>

        {/* ====== Subjects ====== */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12">
            <p className="ec-label-tech ec-label-tech-violet mb-4">SUBJECTS</p>
            <h2 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[64px]">
              <span className="gradient-text">Starting with maths.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-400">
              Cambridge 9709 first. More subjects rolling out monthly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SubjectCard
              icon={Calculator}
              name="Mathematics"
              code="Cambridge 9709"
              available
            />
            <SubjectCard icon={Atom} name="Physics" code="Cambridge 9702" />
            <SubjectCard icon={FlaskConical} name="Chemistry" code="Cambridge 9701" />
            <SubjectCard icon={Microscope} name="Biology" code="Cambridge 9700" />
          </div>
        </section>

        {/* ====== How it works mockup ====== */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12">
            <p className="ec-label-tech ec-label-tech-cyan mb-4">HOW IT WORKS</p>
            <h2 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[64px]">
              <span className="gradient-text">Three steps.</span>
              <br />
              <span className="ec-text-gradient">About 30 seconds.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StepCard
              number="01"
              icon={Camera}
              title="Upload your answer"
              description="Take a photo of your handwritten working. Works from your phone or laptop."
              accent="emerald"
            />
            <StepCard
              number="02"
              icon={Sparkles}
              title="AI marks like an examiner"
              description="Cambridge mark schemes applied automatically. B1, M1, A1 awarded exactly as a real examiner would."
              accent="cyan"
            />
            <StepCard
              number="03"
              icon={TrendingUp}
              title="See what to improve"
              description="A mark-by-mark breakdown plus targeted topics to revise — your fastest path to A*."
              accent="violet"
            />
          </div>

          {/* Compact mockup */}
          <div className="mt-20">
            <LandingMockup />
          </div>
        </section>

        {/* ====== Final CTA ====== */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="ec-card relative overflow-hidden p-12 sm:p-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[100px]" />
              <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/20 blur-[100px]" />
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
            </div>
            <div className="relative">
              <p className="ec-label-tech mb-6 justify-center" style={{ display: 'inline-flex' }}>
                Ready when you are
              </p>
              <h2 className="mb-8 text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[64px]">
                <span className="gradient-text">Know your real</span>
                <br />
                <span className="ec-text-gradient">A-Level score.</span>
              </h2>
              <Link
                href={user ? '/mark' : '/auth/signup'}
                className="ec-btn-primary inline-flex text-lg"
                style={{ padding: '18px 36px' }}
              >
                Start marking free <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-6 text-sm text-slate-500">
                Free during beta · Cambridge A-Level Mathematics 9709
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ====== Footer ====== */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-bold ec-text-gradient text-base">Examcore</span>
          <div className="flex items-center gap-6">
            <Link href="/auth/signin" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <a
              href="mailto:hello@examcore.ai"
              className="transition-colors hover:text-white"
            >
              hello@examcore.ai
            </a>
          </div>
          <span>© 2026 · Built in Pakistan</span>
        </div>
      </footer>
    </div>
  )
}

// ----------------------------- pieces -----------------------------

function SubjectCard({
  icon: Icon,
  name,
  code,
  available,
}: {
  icon: LucideIcon
  name: string
  code: string
  available?: boolean
}) {
  return (
    <div
      className={`ec-card relative overflow-hidden p-6 text-center transition-all duration-300 ${
        available ? 'ec-card-interactive' : 'opacity-60'
      }`}
    >
      {available && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/15 blur-[60px]" />
      )}
      <div className="relative">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            available
              ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
              : 'border-white/5 bg-white/5'
          }`}
        >
          <Icon
            className={`h-7 w-7 ${available ? 'text-emerald-400' : 'text-slate-500'}`}
            strokeWidth={1.75}
          />
        </div>
        <p className="text-base font-bold text-white sm:text-lg">{name}</p>
        <p className="mt-1 text-xs text-slate-500">{code}</p>
        <span
          className={`mt-4 inline-flex rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
            available
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/5 text-slate-500 border border-white/10'
          }`}
        >
          {available ? 'Available' : 'Coming soon'}
        </span>
      </div>
    </div>
  )
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
  accent,
}: {
  number: string
  icon: LucideIcon
  title: string
  description: string
  accent: 'emerald' | 'cyan' | 'violet'
}) {
  const styles = {
    emerald: {
      glow: 'bg-emerald-500/15',
      ring: 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]',
      icon: 'text-emerald-400',
      number: 'text-emerald-400',
    },
    cyan: {
      glow: 'bg-cyan-500/15',
      ring: 'border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_24px_rgba(6,182,212,0.3)]',
      icon: 'text-cyan-400',
      number: 'text-cyan-400',
    },
    violet: {
      glow: 'bg-violet-500/15',
      ring: 'border-violet-500/30 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.3)]',
      icon: 'text-violet-400',
      number: 'text-violet-400',
    },
  }[accent]

  return (
    <div className="ec-card ec-card-interactive relative h-full overflow-hidden p-8">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full ${styles.glow} blur-[80px]`}
      />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${styles.ring}`}
          >
            <Icon
              className={`h-7 w-7 ${styles.icon}`}
              strokeWidth={1.75}
            />
          </div>
          <span
            className={`font-mono text-2xl font-extrabold ${styles.number}`}
          >
            {number}
          </span>
        </div>
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-white">
          {title}
        </h3>
        <p className="leading-relaxed text-slate-400">{description}</p>
      </div>
    </div>
  )
}
