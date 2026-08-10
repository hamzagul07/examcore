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
    <aside className="ms-mark-example-slip mb-6" aria-label="Max coach brief">
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          CB
        </span>
        <div className="ms-mark-example-slip__copy">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <MaxBadge label="Max · early access" />
            {feature ? (
              <span className="text-caption text-[var(--ec-text-secondary)]">{feature}</span>
            ) : null}
          </div>
          <p className="ms-mark-example-slip__title">This week&apos;s coach brief</p>
          <p className="ms-mark-example-slip__lead">
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
          <span className="ms-mark-example-slip__note" aria-hidden>
            built from your mastery · no extra ai cost
          </span>
        </div>
      </div>
      {firstDrill ? (
        <Link
          href={drillHref(firstDrill)}
          className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
        >
          Start {firstDrill.paperCode} Q{firstDrill.questionNumber} -&gt;
        </Link>
      ) : pack.timedPapers[0] ? (
        <Link
          href={pack.timedPapers[0].href}
          className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
        >
          Open timed paper hub -&gt;
        </Link>
      ) : null}
    </aside>
  )
}
