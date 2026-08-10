import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'
import type { MaxExamPack } from '@/lib/max/build-exam-pack'
import { maxEarlyAccessFeature } from '@/lib/max/early-access'
import { drillHref } from '@/lib/insights/drill-link'

/**
 * Max coach brief — always shown when a pack exists so Vault feels immediately valuable.
 * Early-access label only appears when the feature flag is set.
 */
export function MaxCoachBrief({ pack }: { pack: MaxExamPack | null }) {
  if (!pack) return null

  const feature = maxEarlyAccessFeature()
  const topTopics = pack.weakTopics.slice(0, 2).map((t) => t.name)
  const firstDay = pack.days[0]
  const firstDrill = firstDay?.drills[0]

  return (
    <aside className="ms-vault-slip" aria-label="Max coach brief">
      <div className="ms-vault-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          CB
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <MaxBadge label="Coach brief" />
            {feature ? (
              <span className="text-caption text-[var(--ec-acc-teal)]">{feature}</span>
            ) : null}
          </div>
          <p className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
            Start here today
          </p>
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
        </div>
      </div>
      {firstDrill ? (
        <Link href={drillHref(firstDrill)} className="ms-vault-slip__cta">
          Start {firstDrill.paperCode} Q{firstDrill.questionNumber} -&gt;
        </Link>
      ) : pack.timedPapers[0] ? (
        <Link href={pack.timedPapers[0].href} className="ms-vault-slip__cta">
          Open timed paper hub -&gt;
        </Link>
      ) : null}
    </aside>
  )
}
