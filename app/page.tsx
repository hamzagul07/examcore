import Link from "next/link";
import {
  Atom,
  Calculator,
  Camera,
  FlaskConical,
  Microscope,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase-server";

const primaryButtonClass =
  "inline-block bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-6 py-3 rounded-md font-medium transition-all duration-200";

const linkTransitionClass = "transition-colors duration-200";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white text-[var(--foreground)]">
      {/* Section 1: Sticky header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className={`text-xl font-bold text-slate-900 hover:text-slate-700 ${linkTransitionClass}`}
          >
            Examcore
          </Link>
          <nav>
            {user ? (
              <Link
                href="/dashboard"
                className={`text-sm font-medium text-slate-700 hover:text-slate-900 ${linkTransitionClass}`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className={`text-sm font-medium text-slate-700 hover:text-slate-900 ${linkTransitionClass}`}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Section 2: Hero */}
        <section className="hero-bg">
          <div className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Free during beta
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              AI marking that grades like a real Cambridge examiner
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-600 md:text-xl">
              Upload a photo of your answer. Get a Cambridge-grade marking
              breakdown in 30 seconds. Works on past papers and textbook
              questions.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/auth/signin" className={primaryButtonClass}>
                Start marking free
              </Link>
              <Link
                href="#how-it-works"
                className={`inline-block rounded-md border border-slate-300 bg-white px-6 py-3 font-medium text-slate-900 hover:border-slate-400 ${linkTransitionClass}`}
              >
                See how it works
              </Link>
            </div>

            {/* Product mockup */}
            <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-200/50">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-1 text-left text-xs text-slate-500">
                  examcore.ai/mark
                </div>
              </div>
              <div className="p-6 text-left sm:p-8">
                <p className="mb-1 text-sm font-semibold text-slate-500">
                  Q1 — Cambridge 9709/12, May/June 2024
                </p>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="text-5xl font-bold text-emerald-600 sm:text-6xl">
                    3
                  </span>
                  <span className="text-2xl font-bold text-slate-300 sm:text-3xl">
                    / 3
                  </span>
                  <span className="ml-0 text-sm text-slate-600 sm:ml-3">
                    marks earned
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-full rounded-full bg-emerald-500" />
                </div>
                <div className="mt-6 space-y-2">
                  <MarkRow
                    badge="B1"
                    text="Correctly identified the coefficient of x² as 240"
                  />
                  <MarkRow
                    badge="M1"
                    text="Set up the equation 240 = 12 × 80a² correctly"
                  />
                  <MarkRow
                    badge="A1"
                    text="Found a = 0.5 (within accepted range)"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20"
        >
          <h2 className="mb-4 text-center text-3xl font-bold text-slate-900 md:text-4xl">
            How it works
          </h2>
          <p className="mb-12 text-center text-slate-600">
            Three steps. About 30 seconds per answer.
          </p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              icon={Camera}
              title="Upload your answer"
              description="Take a photo of your handwritten working. Works from your phone or laptop."
            />
            <StepCard
              number="2"
              icon={Sparkles}
              title="AI marks like an examiner"
              description="Our AI applies official Cambridge mark schemes, awarding M1, A1, B1 marks just like a real examiner would."
            />
            <StepCard
              number="3"
              icon={TrendingUp}
              title="See exactly what to improve"
              description="Get a mark-by-mark breakdown showing what you earned, what you missed, and which topics to revise next."
            />
          </div>
        </section>

        {/* Section 4: Subjects we cover */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Subjects we cover
            </h2>
            <p className="mx-auto max-w-xl text-lg text-slate-600">
              Starting with A-Level Mathematics. More subjects rolling out
              monthly.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center sm:p-6">
              <Calculator className="mx-auto mb-3 h-10 w-10 text-emerald-700" />
              <p className="text-lg font-semibold text-slate-900">
                Mathematics
              </p>
              <p className="mt-1 text-xs text-slate-600">Cambridge 9709</p>
              <span className="mt-3 inline-block rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                AVAILABLE NOW
              </span>
            </div>
            <SubjectComingSoon icon={Atom} name="Physics" />
            <SubjectComingSoon icon={FlaskConical} name="Chemistry" />
            <SubjectComingSoon icon={Microscope} name="Biology" />
          </div>
        </section>

        {/* Section 5: Final CTA */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-10 text-center md:p-16">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Start marking your practice answers today
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Free during beta. No credit card required.
            </p>
            <div className="mt-8">
              <Link href="/auth/signin" className={primaryButtonClass}>
                Get started free
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Section 6: Footer */}
      <footer className="border-t border-slate-200 bg-[var(--card-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <p className="text-lg font-bold text-slate-900">Examcore</p>
              <p className="mt-2 text-sm text-slate-600">
                AI marking for Cambridge A-Level mathematics.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Product
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link
                    href="#how-it-works"
                    className={`hover:text-slate-900 ${linkTransitionClass}`}
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className={`hover:text-slate-900 ${linkTransitionClass}`}
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className={`hover:text-slate-900 ${linkTransitionClass}`}
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Contact
              </p>
              <a
                href="mailto:hello@examcore.ai"
                className={`text-sm text-slate-600 hover:text-slate-900 ${linkTransitionClass}`}
              >
                hello@examcore.ai
              </a>
            </div>
          </div>
          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row">
            <span>© 2026 Examcore</span>
            <span>Built in Pakistan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MarkRow({ badge, text }: { badge: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:items-center">
      <span className="shrink-0 rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
        {badge}
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
      <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
        {number}
      </div>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
        <Icon className="h-7 w-7 text-emerald-700" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function SubjectComingSoon({
  icon: Icon,
  name,
}: {
  icon: LucideIcon;
  name: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center opacity-70 sm:p-6">
      <Icon className="mx-auto mb-3 h-10 w-10 text-slate-400" />
      <p className="text-lg font-semibold text-slate-700">{name}</p>
      <p className="mt-1 text-xs text-slate-500">Cambridge A-Level</p>
      <span className="mt-3 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
        COMING SOON
      </span>
    </div>
  );
}
