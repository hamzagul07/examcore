import Link from 'next/link'
import type { VaultCoachWeek } from '@/lib/max/vault-coach-inbox'
import { topicDrillHref } from '@/lib/insights/drill-link'

/** In-app archive of the Max weekly coach ritual (recomputed from attempts). */
export function MaxVaultCoachInbox({ weeks }: { weeks: VaultCoachWeek[] }) {
  if (weeks.length === 0) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          WC
        </span>
        <p className="ec-eyebrow mb-0">Weekly coach</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your Max coach inbox
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--teal space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          Same ritual as your Sunday Max email — live inside the Vault so you can act on
          it without leaving MarkScheme.
        </p>
        <ul className="ms-vault__coach-list">
          {weeks.map((w) => (
            <li key={w.weekLabel} className="ms-vault__coach-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
                  {w.title}
                </h3>
                <span className="font-mono text-xs text-[var(--ec-acc-teal)]">
                  {w.weekLabel}
                </span>
              </div>
              <div className="ms-vault__coach-stats">
                <span>
                  <strong>{w.data.marksThisWeek}</strong> marked
                </span>
                <span>
                  avg{' '}
                  <strong>
                    {w.data.avgPctThisWeek !== null
                      ? `${Math.round(w.data.avgPctThisWeek)}%`
                      : '—'}
                  </strong>
                  {w.data.avgPctDelta !== null && Math.abs(w.data.avgPctDelta) >= 1
                    ? ` (${w.data.avgPctDelta > 0 ? '+' : ''}${Math.round(w.data.avgPctDelta)})`
                    : ''}
                </span>
                <span>
                  form <strong>{w.data.predictedGrade ?? '—'}</strong>
                </span>
              </div>
              {w.data.weakTopics.length > 0 ? (
                <ul className="mt-2 m-0 list-none space-y-1.5 pl-0">
                  {w.data.weakTopics.map((t) => (
                    <li key={`${t.subjectCode}-${t.topicCode}`}>
                      <Link
                        href={topicDrillHref(t.subjectCode, t.topicCode)}
                        className="ec-link font-semibold"
                      >
                        Drill {t.name}
                      </Link>
                      <span className="text-[var(--ec-text-secondary)]">
                        {' '}
                        · {t.percentage}%
                        {t.subjectLabel ? ` · ${t.subjectLabel}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-caption m-0 mt-2 text-[var(--ec-text-secondary)]">
                  Mark a few questions this week to unlock weak-topic drills.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
