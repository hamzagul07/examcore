import Link from 'next/link'
import type { Recommendation } from '@/lib/insights/types'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { MarkQuestionCta } from '@/components/dashboard/MarkQuestionCta'
import { FirstMarkPreview } from '@/components/dashboard/FirstMarkPreview'

type SubjectChip = {
  name: string
  code: string | null
}

type Props = {
  subjects: SubjectChip[]
  subjectLabel: string | null
  recommendations: Recommendation[]
  board?: string | null
  firstName?: string | null
}

/** Empty account home — one first-mark desk composition (no HomeHero stack). */
export function NewUserHome({
  subjects,
  subjectLabel,
  recommendations,
  board = null,
  firstName = null,
}: Props) {
  const greet = firstName?.trim() ? firstName.trim() : null

  return (
    <div className="ms-new-user-home space-y-6 sm:space-y-8">
      <section className="ms-new-user-desk ms-new-user-hero overflow-hidden p-0">
        <div className="ms-new-user-hero__head">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">
              {greet ? `${greet} · first mark` : 'First mark'}
            </p>
            <span className="ec-ink-stamp" aria-hidden>
              M1
            </span>
          </div>
          <h1 className="text-hero" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.35rem)' }}>
            Put one question under the <em>scheme</em>
          </h1>
          <p className="text-body mt-2 max-w-xl text-[var(--ec-text-secondary)]">
            Upload a photo of your working or pick a past-paper question. After one
            mark, you&apos;ll see which topics keep costing you — and the progress
            desk starts filling in.
          </p>
          <p className="ms-new-user-hero__note" aria-hidden>
            one honest script beats a week of vague revision
          </p>
          <div className="mt-5">
            <MarkQuestionCta className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="ms-new-user-hero__body">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="ms-overline" style={{ marginBottom: 6 }}>
                Sample return
              </p>
              <h2 className="text-base font-semibold text-[var(--ec-text-primary)]">
                After one mark, you&apos;ll see where ink was lost
              </h2>
              <p className="text-caption mt-1 max-w-lg">
                Topic blind spots, syllabus coverage, and the gap to your target
                grade — built from real attempts, not vibes.
              </p>
            </div>
            <Link
              href="/dashboard/progress"
              className="inline-flex min-h-[44px] shrink-0 items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
            >
              Preview progress -&gt;
            </Link>
          </div>

          <FirstMarkPreview board={board} />
        </div>
      </section>

      {subjects.length > 0 ? (
        <ActiveSubjects subjects={subjects} title="Subjects on file" />
      ) : null}

      {recommendations.length > 0 ? (
        <ContinueWork recommendations={recommendations} subjectLabel={subjectLabel} />
      ) : null}

      <p className="text-caption text-center sm:text-left">
        Questions?{' '}
        <Link href="/how-it-works" className="ec-link">
          How it works
        </Link>
        {' · '}
        <Link href="/faq" className="ec-link">
          FAQ
        </Link>
        {' · '}
        <Link href="/courses" className="ec-link">
          Free courses
        </Link>
      </p>
    </div>
  )
}
