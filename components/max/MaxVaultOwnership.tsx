import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'
import type { VaultOwnership } from '@/lib/max/vault-data'
import { TIER_MONTHLY_CAPS } from '@/lib/billing/caps'

/**
 * Makes purchasing Max feel tangible: priority, weekly coach, credit balance,
 * and mark headroom vs Scholar.
 */
export function MaxVaultOwnership({ ownership }: { ownership: VaultOwnership }) {
  const scholarCap = TIER_MONTHLY_CAPS.scholar
  const pastScholar = ownership.marksUsed > scholarCap

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          MX
        </span>
        <p className="ec-eyebrow mb-0">You bought Max</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your Max privileges
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--brand space-y-4">
        <div className="flex flex-wrap gap-2">
          <MaxBadge label="Priority marking" />
          {ownership.weeklyCoach ? <MaxBadge label="Weekly coach" /> : null}
          <MaxBadge label="Resource Vault" />
        </div>
        <ul className="ms-vault__perk-grid">
          <li className="ms-vault__perk">
            <span className="ms-vault__perk-value">
              {ownership.marksRemaining}
              <span className="ms-vault__perk-of">/{ownership.marksCap}</span>
            </span>
            <span className="ms-vault__perk-label">Marks left this month</span>
            <span className="text-caption text-[var(--ec-text-secondary)]">
              {pastScholar
                ? `Scholar would have capped at ${scholarCap} — you kept going.`
                : `Scholar caps at ${scholarCap}. Max is built for exam-season volume.`}
            </span>
          </li>
          <li className="ms-vault__perk">
            <span className="ms-vault__perk-value">{ownership.credits}</span>
            <span className="ms-vault__perk-label">Bonus credits</span>
            <span className="text-caption text-[var(--ec-text-secondary)]">
              Welcome / sprint gifts land here — burn them on extra marks when the
              monthly cap gets loud.
            </span>
          </li>
          <li className="ms-vault__perk">
            <span className="ms-vault__perk-value">ON</span>
            <span className="ms-vault__perk-label">Priority queue</span>
            <span className="text-caption text-[var(--ec-text-secondary)]">
              Whole-paper batches and deep marks jump the Max lane — faster returns
              when you&apos;re in flow.
            </span>
          </li>
        </ul>
        <p className="text-caption m-0">
          <Link href="/account/billing" className="ec-link font-semibold">
            See billing & usage →
          </Link>
        </p>
      </div>
    </section>
  )
}
