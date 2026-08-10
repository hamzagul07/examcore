import Link from 'next/link'
import { topicDrillHref } from '@/lib/insights/drill-link'
import type { LeafMastery } from '@/lib/mastery'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  subjectCode: string
  subjectLabel: string | null
  critical: LeafMastery[]
}

/**
 * 80/20 surface: the few topics leaking most marks — one drill each.
 * Server-rendered slip; no cards-for-decoration, just the desk metaphor.
 */
export function MarksLeakingStrip({ subjectCode, subjectLabel, critical }: Props) {
  if (critical.length === 0) return null
  const top = critical.slice(0, 3)

  return (
    <section className="ms-leaking mb-6" aria-labelledby="marks-leaking-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
            80
          </span>
          <div>
            <p className="ec-eyebrow mb-0">Marks you&apos;re leaking</p>
            <h2 id="marks-leaking-title" className="text-title" style={{ margin: 0 }}>
              Fix these first
            </h2>
            <p className="text-caption mt-1">
              {subjectLabel
                ? `A few ${subjectLabel} topics are costing most of your marks.`
                : 'A few topics are costing most of your marks.'}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/review"
          className="inline-flex min-h-[44px] shrink-0 items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
        >
          See due list →
        </Link>
      </div>
      <ul className="ms-leaking__list">
        {top.map((leaf) => (
          <li key={leaf.code}>
            <LoadingLink
              href={topicDrillHref(subjectCode, leaf.code)}
              variant="card"
              className="ms-leaking__row"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
                  {leaf.name}
                  <span className="font-normal text-[var(--ec-text-secondary)]">
                    {' '}
                    · {leaf.code}
                  </span>
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--ec-text-secondary)]">
                  {Math.round(leaf.percentage)}% · {leaf.attemptsCount}{' '}
                  {leaf.attemptsCount === 1 ? 'attempt' : 'attempts'}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--ec-brand)]">
                Drill →
              </span>
            </LoadingLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
