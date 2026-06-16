import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpen, Target } from 'lucide-react'
import type { Recommendation } from '@/lib/insights/types'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { MarkQuestionCta } from '@/components/dashboard/MarkQuestionCta'

type SubjectChip = {
  name: string
  code: string | null
}

type Props = {
  subjects: SubjectChip[]
  subjectLabel: string | null
  recommendations: Recommendation[]
}

const PROGRESS_PLACEHOLDERS = [
  { label: 'Topics tracked', icon: Target },
  { label: 'Syllabus coverage', icon: BookOpen },
  { label: 'Grade trend', icon: BarChart3 },
] as const

/** Richer home for users who have not marked anything yet. */
export function NewUserHome({ subjects, subjectLabel, recommendations }: Props) {
  return (
    <div className="ms-new-user-home space-y-6 sm:space-y-8">
      <section className="ec-card ms-dash-card ms-new-user-hero overflow-hidden p-0">
        <div className="border-b border-[var(--ec-border)] bg-[color-mix(in_srgb,var(--ec-brand)_6%,var(--ec-surface))] px-5 py-5 sm:px-6 sm:py-6">
          <p className="ec-eyebrow mb-2">First step</p>
          <h2 className="text-title">Mark your first question</h2>
          <p className="text-body mt-2 max-w-xl text-[var(--ec-text-secondary)]">
            Upload a photo of your work or pick a past-paper question. You&apos;ll get
            examiner-style feedback in under a minute — then your progress dashboard
            starts filling in.
          </p>
          <div className="mt-5">
            <MarkQuestionCta className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--ec-text-primary)]">
                What unlocks after your first mark
              </h3>
              <p className="text-caption mt-1 max-w-lg">
                Topic mastery, syllabus coverage, and grade trajectory — all on your
                progress dashboard.
              </p>
            </div>
            <Link
              href="/dashboard/progress"
              className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-semibold text-[var(--ec-brand)]"
            >
              Preview progress
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {PROGRESS_PLACEHOLDERS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-4 py-4 text-center"
              >
                <Icon
                  className="mx-auto mb-2 h-5 w-5 text-[var(--ec-text-secondary)]"
                  aria-hidden
                />
                <p className="text-2xl font-bold tabular-nums text-[var(--ec-text-secondary)]">
                  —
                </p>
                <p className="text-caption mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {subjects.length > 0 ? (
        <ActiveSubjects subjects={subjects} title="Your subjects" />
      ) : null}

      {recommendations.length > 0 ? (
        <ContinueWork recommendations={recommendations} subjectLabel={subjectLabel} />
      ) : null}

      <section className="ec-card ms-dash-card p-5 sm:p-6">
        <h2 className="text-title mb-4">How it works</h2>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ec-brand)]/10 text-sm font-bold text-[var(--ec-brand)]">
              1
            </span>
            <div>
              <p className="font-semibold text-[var(--ec-text-primary)]">Browse free courses</p>
              <p className="text-sm text-[var(--ec-text-secondary)]">
                Syllabus-aligned lessons with flashcards and past-paper questions — no card required.
              </p>
              <Link
                href="/courses"
                className="ec-link mt-1 inline-flex min-h-[44px] items-center text-sm font-medium"
              >
                Open courses →
              </Link>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ec-brand)]/10 text-sm font-bold text-[var(--ec-brand)]">
              2
            </span>
            <div>
              <p className="font-semibold text-[var(--ec-text-primary)]">Mark a practice question</p>
              <p className="text-sm text-[var(--ec-text-secondary)]">
                Use the Mark tab — upload an answer or choose from real past papers.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ec-brand)]/10 text-sm font-bold text-[var(--ec-brand)]">
              3
            </span>
            <div>
              <p className="font-semibold text-[var(--ec-text-primary)]">Open your progress dashboard</p>
              <p className="text-sm text-[var(--ec-text-secondary)]">
                See topic mastery, syllabus coverage, and what to study next.
              </p>
              <Link
                href="/dashboard/progress"
                className="ec-link mt-1 inline-flex min-h-[44px] items-center text-sm font-medium"
              >
                View progress →
              </Link>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ec-brand)]/10 text-sm font-bold text-[var(--ec-brand)]">
              4
            </span>
            <div>
              <p className="font-semibold text-[var(--ec-text-primary)]">Drill weak topics</p>
              <p className="text-sm text-[var(--ec-text-secondary)]">
                Smart recommendations appear here once you have a few marks under your belt.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  )
}
