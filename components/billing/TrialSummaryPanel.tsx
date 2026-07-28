'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileText, PauseCircle, Target, X } from 'lucide-react'
import type { TrialSummary } from '@/lib/billing/trial-summary'

/**
 * The end of the reverse trial, which is the highest-stakes moment in the
 * funnel — and the one the app previously had no screen for at all.
 *
 * Three rules the copy holds to:
 *
 * 1. Nothing is deleted, and it never implies otherwise. Marked scripts stay
 *    readable on the free tier forever. What stops is the coaching *around*
 *    them — the Sunday report, generated drills, verify on a full script. So
 *    the heading leads with what the student keeps and the list is titled
 *    "pauses", not "you lose".
 * 2. The numbers are theirs and are stated exactly. Scripts marked, marks
 *    earned, the weakest topic by name and percentage. Round numbers invented
 *    for effect are the fastest way to lose a reader who can count.
 * 3. Declining is a real, unpunished option. A student who cannot comfortably
 *    say no is a student whose parent reverses the charge later, and a
 *    Merchant-of-Record account does not survive many of those.
 *
 * The empty case is deliberately NOT a sales pitch: someone who never marked
 * anything during the trial has no evidence the product works, and asking them
 * to pay is asking for a refund. They get pointed back at the product instead.
 */

const dismissKey = (phase: TrialSummary['phase']) => `ec:trial-panel-dismissed:${phase}`

export function TrialSummaryPanel({
  summary,
  className = '',
}: {
  summary: TrialSummary
  className?: string
}) {
  const [dismissed, setDismissed] = useState(true)

  // Starts dismissed and reveals after the storage check so the panel never
  // flashes in for someone who already dismissed it on a previous visit.
  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey(summary.phase)) === '1')
  }, [summary.phase])

  const dismiss = () => {
    localStorage.setItem(dismissKey(summary.phase), '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const ended = summary.phase === 'just_ended'

  if (summary.empty) {
    return (
      <PanelShell onDismiss={dismiss} className={className}>
        <h2 className="text-lg font-bold text-[var(--ec-text-primary)]">
          {ended
            ? 'Your trial ended — and nothing went through it'
            : `Your trial ends ${inDays(summary.daysLeft)} — and nothing has gone through it`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          You had Scholar access for a week and didn&apos;t mark a single answer, so
          there&apos;s nothing here for us to sell you on. Fixing that takes about three
          minutes: type a question, type what you&apos;d write in the exam, and see
          where the marks actually land.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href="/mark" className="ec-btn-primary">
            Mark one question
          </Link>
          <button type="button" onClick={dismiss} className="ec-btn-underline">
            Not now
          </button>
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell onDismiss={dismiss} className={className}>
      <h2 className="text-lg font-bold text-[var(--ec-text-primary)]">
        {ended
          ? 'Your trial ended. Everything you marked is still here.'
          : `Your trial ends ${inDays(summary.daysLeft)}. Everything you marked stays.`}
      </h2>

      <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
        <Stat>{summary.scriptsMarked}</Stat>{' '}
        {summary.scriptsMarked === 1 ? 'script' : 'scripts'} marked
        {summary.marksAvailable > 0 ? (
          <>
            {' · '}
            <Stat>
              {summary.marksEarned}/{summary.marksAvailable}
            </Stat>{' '}
            marks earned
          </>
        ) : null}
        {summary.weakest ? (
          <>
            {' · weakest: '}
            <Stat>{summary.weakest.name}</Stat> ({summary.weakest.percentage}%)
          </>
        ) : null}
      </p>

      <p className="ec-eyebrow mt-5">
        {ended ? 'What pauses today' : 'What pauses when it ends'}
      </p>
      <ul className="mt-2 flex flex-col gap-2.5 text-sm text-[var(--ec-text-secondary)]">
        <Pause icon={<FileText className="h-4 w-4" aria-hidden />}>
          Your examiner&apos;s report stops arriving on Sundays.
        </Pause>
        <Pause icon={<Target className="h-4 w-4" aria-hidden />}>
          {summary.weakest ? (
            <>
              <span className="font-medium text-[var(--ec-text-primary)]">
                {summary.weakest.name}
              </span>{' '}
              stays on the list — the drills that close it stop being generated.
            </>
          ) : (
            <>Weak topics keep being tracked; the drills that close them stop.</>
          )}
        </Pause>
        <Pause icon={<PauseCircle className="h-4 w-4" aria-hidden />}>
          Second-opinion marking goes back to the first 3 questions of a script.
        </Pause>
      </ul>

      {summary.pointsToGo !== null && summary.targetGrade && !summary.onTrack ? (
        <p className="mt-4 text-sm font-medium text-[var(--ec-text-primary)]">
          You&apos;re {summary.pointsToGo} percentage {pluralPoints(summary.pointsToGo)} off
          your target grade {summary.targetGrade}.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href="/pricing" className="ec-btn-primary">
          Keep my coach
          <ArrowRight className="ml-1.5 inline h-4 w-4" aria-hidden />
        </Link>
        <button type="button" onClick={dismiss} className="ec-btn-underline">
          {ended
            ? `Stay on free — my ${summary.scriptsMarked} ${
                summary.scriptsMarked === 1 ? 'script stays' : 'scripts stay'
              } saved`
            : 'No thanks'}
        </button>
      </div>
    </PanelShell>
  )
}

function PanelShell({
  children,
  onDismiss,
  className = '',
}: {
  children: React.ReactNode
  onDismiss: () => void
  className?: string
}) {
  return (
    <section
      className={`ec-card relative border-[var(--ec-brand)]/40 bg-[var(--ec-brand)]/[0.04] p-5 sm:p-6 ${className}`}
      aria-label="Trial status"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="pr-10">{children}</div>
    </section>
  )
}

function Stat({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-[var(--ec-text-primary)]">{children}</span>
  )
}

function Pause({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-[var(--ec-brand)]">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

function inDays(days: number): string {
  if (days <= 1) return 'tomorrow'
  return `in ${days} days`
}

function pluralPoints(n: number): string {
  return n === 1 ? 'point' : 'points'
}
