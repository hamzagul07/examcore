import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'
import type { MaxExamPack } from '@/lib/max/build-exam-pack'
import { hasMaxEarlyAccessFeature, maxEarlyAccessFeature } from '@/lib/max/early-access'
import { drillHref } from '@/lib/insights/drill-link'

/**
 * Early-access Max coach brief — derived from this week's pack (no extra AI).
 * Only renders when NEXT_PUBLIC_MAX_EARLY_ACCESS_FEATURE is configured.
 */
export function MaxCoachBrief({ pack }: { pack: MaxExamPack | null }) {
  if (!hasMaxEarlyAccessFeature() || !pack) return null

  const feature = maxEarlyAccessFeature()
  const topTopics = pack.weakTopics.slice(0, 2).map((t) => t.name)
  const firstDay = pack.days[0]
  const firstDrill = firstDay?.drills[0]

  return (
    <section className="ec-card ec-card--paper mb-6 space-y-3 border border-[var(--ec-brand)]/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <MaxBadge label="Max · early access" />
        {feature ? (
          <span className="text-sm text-[var(--ec-text-secondary)]">{feature}</span>
        ) : null}
      </div>
      <h2 className="text-lg font-bold text-[var(--ec-text-primary)] m-0">
        This week&apos;s coach brief
      </h2>
      <p className="text-body m-0 text-[var(--ec-text-secondary)]">
        {pack.isSprint
          ? `Sprint mode — ${pack.daysLeft ?? '?'} day${pack.daysLeft === 1 ? '' : 's'} to exam.`
          : `Week of ${pack.weekLabel}.`}{' '}
        {topTopics.length > 0
          ? `Prioritise ${topTopics.join(' and ')}.`
          : 'Mark a few questions so we can aim the drills.'}{' '}
        {firstDay
          ? `Day 1: ${firstDay.focus}${
              firstDay.minutes ? ` (~${firstDay.minutes} min)` : ''
            }.`
          : null}
      </p>
      {firstDrill ? (
        <p className="text-body m-0">
          <Link href={drillHref(firstDrill)} className="ec-link font-semibold">
            Start with {firstDrill.paperCode} Q{firstDrill.questionNumber}
          </Link>
          <span className="text-[var(--ec-text-secondary)]"> — {firstDrill.reason}</span>
        </p>
      ) : pack.timedPapers[0] ? (
        <p className="text-body m-0">
          <Link href={pack.timedPapers[0].href} className="ec-link font-semibold">
            Open timed paper hub
          </Link>
        </p>
      ) : null}
    </section>
  )
}
