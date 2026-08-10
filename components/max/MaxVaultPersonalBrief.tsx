import Link from 'next/link'
import type { VaultPersonalBrief } from '@/lib/max/vault-personal-brief'

/** In-Vault briefing from the student's recent marks — no email. */
export function MaxVaultPersonalBrief({ brief }: { brief: VaultPersonalBrief | null }) {
  if (!brief) return null

  return (
    <section className="ms-vault__section" aria-labelledby="ms-vault-brief-title">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          YOU
        </span>
        <p className="ec-eyebrow mb-0">Your desk today</p>
        <h2 id="ms-vault-brief-title" className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          {brief.headline}
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--brand space-y-3">
        {brief.recentAvgPct != null ? (
          <p className="ms-vault__brief-stat m-0">
            <span className="ms-vault__brief-stat-value">{brief.recentAvgPct}%</span>
            <span className="text-[var(--ec-text-secondary)]">
              {' '}
              on recent {brief.focusName} marks · {brief.attemptCount} attempt
              {brief.attemptCount === 1 ? '' : 's'}
            </span>
          </p>
        ) : null}
        <ul className="m-0 list-none space-y-2 pl-0">
          {brief.lines.map((line) => (
            <li key={line} className="text-body text-[var(--ec-text-secondary)]">
              {line}
            </li>
          ))}
        </ul>
        <p className="m-0">
          <Link href={brief.nextHref} className="ec-btn-primary text-sm">
            {brief.nextLabel}
          </Link>
        </p>
      </div>
    </section>
  )
}
